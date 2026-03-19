import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type {
  AllowOnceGrant,
  AllowOnceGrantStatus,
  Clock,
  PendingAction,
  PendingActionLifecycleStatus,
} from '../types.js';
import { createId, toIsoString } from '../utils.js';
import type { AuditLog } from './audit.js';
import type { ClawGuardLimits } from './limits.js';
import { getNextGrantState, getNextPendingActionState } from './state-machine.js';

export interface CreatePendingActionInput {
  readonly session_key: string;
  readonly session_id?: string;
  readonly agent_id?: string;
  readonly run_id: string;
  readonly tool_call_id?: string;
  readonly tool_name: string;
  readonly action_title?: PendingAction['action_title'];
  readonly params: Record<string, unknown>;
  readonly action_fingerprint: string;
  readonly decision?: PendingAction['decision'];
  readonly reason_summary: string;
  readonly reason_code?: PendingAction['reason_code'];
  readonly risk_level?: PendingAction['risk_level'];
  readonly impact_scope?: PendingAction['impact_scope'];
  readonly guidance_summary?: PendingAction['guidance_summary'];
}

export interface StateRepositoryOptions {
  readonly clock: Clock;
  readonly audit: AuditLog;
  readonly approvalTtlSeconds: number;
  readonly limits: ClawGuardLimits;
  readonly snapshotFilePath?: string;
}

export type PendingActionMutationResult =
  | {
      readonly ok: true;
      readonly pendingAction: PendingAction;
      readonly grant?: AllowOnceGrant;
    }
  | {
      readonly ok: false;
      readonly reason: 'not_found' | 'invalid_transition';
      readonly currentState?: PendingActionLifecycleStatus;
    };

export type ConsumeGrantResult =
  | { readonly ok: true; readonly grant: AllowOnceGrant; readonly pendingAction?: PendingAction }
  | { readonly ok: false; readonly reason: 'not_found' };

interface SnapshotPayload {
  readonly version: 1;
  readonly pendingActions: PendingAction[];
  readonly allowOnceGrants: AllowOnceGrant[];
}

function clonePendingAction(entry: PendingAction): PendingAction {
  return {
    ...entry,
    params: structuredClone(entry.params),
  };
}

function cloneGrant(entry: AllowOnceGrant): AllowOnceGrant {
  return { ...entry };
}

export class StateRepository {
  private readonly pendingActions = new Map<string, PendingAction>();

  private readonly allowOnceGrants = new Map<string, AllowOnceGrant>();

  private readonly pendingActionStates = new Map<string, PendingActionLifecycleStatus>();

  private readonly grantStates = new Map<string, AllowOnceGrantStatus>();

  public constructor(private readonly options: StateRepositoryOptions) {
    this.restoreSnapshot();
    this.refreshLiveState();
  }

  public listPendingActions(): PendingAction[] {
    this.refreshLiveState();
    return [...this.pendingActions.values()]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map(clonePendingAction);
  }

  public listAllowOnceGrants(): AllowOnceGrant[] {
    this.refreshLiveState();
    return [...this.allowOnceGrants.values()]
      .sort((left, right) => right.issued_at.localeCompare(left.issued_at))
      .map(cloneGrant);
  }

  public getPendingActionById(pendingActionId: string): PendingAction | undefined {
    this.refreshLiveState();
    const entry = this.pendingActions.get(pendingActionId);
    return entry ? clonePendingAction(entry) : undefined;
  }

  public getPendingActionState(
    pendingActionId: string,
  ): PendingActionLifecycleStatus | undefined {
    this.refreshLiveState();
    return this.pendingActions.get(pendingActionId)?.status ?? this.pendingActionStates.get(pendingActionId);
  }

  public findLivePendingByFingerprint(params: {
    session_key: string;
    tool_name: string;
    action_fingerprint: string;
  }): PendingAction | undefined {
    this.refreshLiveState();
    const entry = [...this.pendingActions.values()].find(
      (candidate) =>
        candidate.session_key === params.session_key &&
        candidate.tool_name === params.tool_name &&
        candidate.action_fingerprint === params.action_fingerprint,
    );

    return entry ? clonePendingAction(entry) : undefined;
  }

  public createPendingAction(input: CreatePendingActionInput): PendingAction {
    this.refreshLiveState();
    this.evictOldestPendingActionsIfFull();

    const now = this.options.clock.now();
    const entry: PendingAction = {
      pending_action_id: createId('pending'),
      session_key: input.session_key,
      session_id: input.session_id,
      agent_id: input.agent_id,
      run_id: input.run_id,
      tool_call_id: input.tool_call_id,
      tool_name: input.tool_name,
      action_title: input.action_title,
      params: structuredClone(input.params),
      action_fingerprint: input.action_fingerprint,
      decision: input.decision,
      reason_summary: input.reason_summary,
      reason_code: input.reason_code,
      risk_level: input.risk_level,
      impact_scope: input.impact_scope,
      guidance_summary: input.guidance_summary,
      status: 'pending',
      created_at: toIsoString(now),
      expires_at: toIsoString(new Date(now.getTime() + this.options.approvalTtlSeconds * 1000)),
    };

    this.pendingActions.set(entry.pending_action_id, entry);
    this.pendingActionStates.set(entry.pending_action_id, entry.status);
    this.persistSnapshot();
    return clonePendingAction(entry);
  }

  public approvePendingAction(pendingActionId: string): PendingActionMutationResult {
    this.refreshLiveState();

    const currentState = this.getPendingActionState(pendingActionId);
    if (!currentState) {
      return { ok: false, reason: 'not_found' };
    }

    const nextState = getNextPendingActionState(currentState, 'approve');
    if (!nextState) {
      return { ok: false, reason: 'invalid_transition', currentState };
    }

    const existing = this.pendingActions.get(pendingActionId);
    if (!existing) {
      return { ok: false, reason: 'invalid_transition', currentState };
    }

    if (this.findLiveGrantByPendingActionId(pendingActionId)) {
      return { ok: false, reason: 'invalid_transition', currentState };
    }

    this.evictOldestGrantsIfFull();

    const now = this.options.clock.now();
    const expiresAt = toIsoString(new Date(now.getTime() + this.options.approvalTtlSeconds * 1000));
    const updated: PendingAction = {
      ...existing,
      status: nextState as PendingAction['status'],
      approved_at: toIsoString(now),
      expires_at: expiresAt,
    };

    const grant: AllowOnceGrant = {
      grant_id: createId('grant'),
      pending_action_id: updated.pending_action_id,
      session_key: updated.session_key,
      tool_name: updated.tool_name,
      action_fingerprint: updated.action_fingerprint,
      issued_at: toIsoString(now),
      expires_at: expiresAt,
    };

    this.pendingActions.set(updated.pending_action_id, updated);
    this.pendingActionStates.set(updated.pending_action_id, updated.status);
    this.allowOnceGrants.set(grant.grant_id, grant);
    this.grantStates.set(grant.grant_id, 'issued');
    this.persistSnapshot();

    return {
      ok: true,
      pendingAction: clonePendingAction(updated),
      grant: cloneGrant(grant),
    };
  }

  public denyPendingAction(pendingActionId: string): PendingActionMutationResult {
    this.refreshLiveState();

    const currentState = this.getPendingActionState(pendingActionId);
    if (!currentState) {
      return { ok: false, reason: 'not_found' };
    }

    const nextState = getNextPendingActionState(currentState, 'deny');
    if (!nextState) {
      return { ok: false, reason: 'invalid_transition', currentState };
    }

    const existing = this.pendingActions.get(pendingActionId);
    if (!existing) {
      return { ok: false, reason: 'invalid_transition', currentState };
    }

    this.pendingActions.delete(pendingActionId);
    this.pendingActionStates.set(pendingActionId, nextState);
    this.removeLiveGrantByPendingActionId(pendingActionId, 'revoke');
    this.persistSnapshot();

    return {
      ok: true,
      pendingAction: {
        ...clonePendingAction(existing),
        status: nextState as PendingAction['status'],
      },
    };
  }

  public consumeMatchingGrant(params: {
    session_key: string;
    tool_name: string;
    action_fingerprint: string;
  }): ConsumeGrantResult {
    this.refreshLiveState();

    const grant = [...this.allowOnceGrants.values()].find(
      (candidate) =>
        candidate.session_key === params.session_key &&
        candidate.tool_name === params.tool_name &&
        candidate.action_fingerprint === params.action_fingerprint,
    );

    if (!grant) {
      return { ok: false, reason: 'not_found' };
    }

    const grantState = this.grantStates.get(grant.grant_id) ?? 'issued';
    const nextGrantState = getNextGrantState(grantState, 'consume');
    if (!nextGrantState) {
      return { ok: false, reason: 'not_found' };
    }

    const pendingState = this.getPendingActionState(grant.pending_action_id);
    if (!pendingState) {
      return { ok: false, reason: 'not_found' };
    }

    const pendingAction = this.pendingActions.get(grant.pending_action_id);

    const nextPendingState = getNextPendingActionState(pendingState, 'consume');
    if (!nextPendingState) {
      return { ok: false, reason: 'not_found' };
    }

    this.allowOnceGrants.delete(grant.grant_id);
    this.grantStates.set(grant.grant_id, nextGrantState);
    this.pendingActions.delete(grant.pending_action_id);
    this.pendingActionStates.set(grant.pending_action_id, nextPendingState);
    this.persistSnapshot();

    return {
      ok: true,
      grant: cloneGrant(grant),
      pendingAction: pendingAction ? clonePendingAction(pendingAction) : undefined,
    };
  }

  private refreshLiveState(): void {
    if (this.sweepExpired()) {
      this.persistSnapshot();
    }
  }

  private sweepExpired(): boolean {
    const now = toIsoString(this.options.clock.now());
    let changed = false;

    for (const entry of [...this.pendingActions.values()]) {
      if (entry.expires_at > now) {
        continue;
      }

      const nextState = getNextPendingActionState(entry.status, 'expire');
      if (!nextState) {
        continue;
      }

      this.pendingActions.delete(entry.pending_action_id);
      this.pendingActionStates.set(entry.pending_action_id, nextState);
      this.removeLiveGrantByPendingActionId(entry.pending_action_id, 'expire');
      changed = true;
      this.options.audit.record({
        kind: 'expired',
        detail: `Expired pending action ${entry.pending_action_id}.`,
        session_key: entry.session_key,
        run_id: entry.run_id,
        tool_call_id: entry.tool_call_id,
        tool_name: entry.tool_name,
        pending_action_id: entry.pending_action_id,
        action_fingerprint: entry.action_fingerprint,
      });
    }

    for (const grant of [...this.allowOnceGrants.values()]) {
      if (grant.expires_at > now) {
        continue;
      }

      const nextState = getNextGrantState(this.grantStates.get(grant.grant_id) ?? 'issued', 'expire');
      if (!nextState) {
        continue;
      }

      this.allowOnceGrants.delete(grant.grant_id);
      this.grantStates.set(grant.grant_id, nextState);
      changed = true;
      this.options.audit.record({
        kind: 'expired',
        detail: `Expired allow-once grant ${grant.grant_id}.`,
        session_key: grant.session_key,
        tool_name: grant.tool_name,
        pending_action_id: grant.pending_action_id,
        action_fingerprint: grant.action_fingerprint,
      });
    }

    return changed;
  }

  private evictOldestPendingActionsIfFull(): void {
    while (this.pendingActions.size >= this.options.limits.pendingActions) {
      const oldest = [...this.pendingActions.values()].sort((left, right) =>
        left.created_at.localeCompare(right.created_at),
      )[0];
      if (!oldest) {
        return;
      }

      const nextState = getNextPendingActionState(oldest.status, 'evict');
      if (!nextState) {
        return;
      }

      this.pendingActions.delete(oldest.pending_action_id);
      this.pendingActionStates.set(oldest.pending_action_id, nextState);
      this.removeLiveGrantByPendingActionId(oldest.pending_action_id, 'evict');
      this.options.audit.record({
        kind: 'evicted',
        detail: `Evicted pending action ${oldest.pending_action_id} after reaching capacity.`,
        session_key: oldest.session_key,
        run_id: oldest.run_id,
        tool_call_id: oldest.tool_call_id,
        tool_name: oldest.tool_name,
        pending_action_id: oldest.pending_action_id,
        action_fingerprint: oldest.action_fingerprint,
      });
    }
  }

  private evictOldestGrantsIfFull(): void {
    while (this.allowOnceGrants.size >= this.options.limits.allowOnceGrants) {
      const oldest = [...this.allowOnceGrants.values()].sort((left, right) =>
        left.issued_at.localeCompare(right.issued_at),
      )[0];
      if (!oldest) {
        return;
      }

      const nextState = getNextGrantState(this.grantStates.get(oldest.grant_id) ?? 'issued', 'evict');
      if (!nextState) {
        return;
      }

      this.allowOnceGrants.delete(oldest.grant_id);
      this.grantStates.set(oldest.grant_id, nextState);
      const pending = this.pendingActions.get(oldest.pending_action_id);
      if (pending) {
        const nextPendingState = getNextPendingActionState(pending.status, 'evict');
        if (nextPendingState) {
          this.pendingActions.delete(oldest.pending_action_id);
          this.pendingActionStates.set(oldest.pending_action_id, nextPendingState);
          this.options.audit.record({
            kind: 'evicted',
            detail: `Evicted pending action ${oldest.pending_action_id} while evicting its live grant.`,
            session_key: pending.session_key,
            run_id: pending.run_id,
            tool_call_id: pending.tool_call_id,
            tool_name: pending.tool_name,
            pending_action_id: pending.pending_action_id,
            action_fingerprint: pending.action_fingerprint,
          });
        }
      }

      this.options.audit.record({
        kind: 'evicted',
        detail: `Evicted allow-once grant ${oldest.grant_id} after reaching capacity.`,
        session_key: oldest.session_key,
        tool_name: oldest.tool_name,
        pending_action_id: oldest.pending_action_id,
        action_fingerprint: oldest.action_fingerprint,
      });
    }
  }

  private findLiveGrantByPendingActionId(pendingActionId: string): AllowOnceGrant | undefined {
    return [...this.allowOnceGrants.values()].find(
      (candidate) => candidate.pending_action_id === pendingActionId,
    );
  }

  private removeLiveGrantByPendingActionId(
    pendingActionId: string,
    transition: 'expire' | 'evict' | 'revoke',
  ): void {
    const grant = this.findLiveGrantByPendingActionId(pendingActionId);
    if (!grant) {
      return;
    }

    const currentState = this.grantStates.get(grant.grant_id) ?? 'issued';
    const nextState = getNextGrantState(currentState, transition);
    if (!nextState) {
      return;
    }

    this.allowOnceGrants.delete(grant.grant_id);
    this.grantStates.set(grant.grant_id, nextState);

    const kind =
      transition === 'revoke'
        ? 'allow_once_revoked'
        : transition === 'expire'
          ? 'expired'
          : 'evicted';
    const detailPrefix =
      transition === 'expire'
        ? 'Expired'
        : transition === 'evict'
          ? 'Evicted'
          : 'Revoked';

    this.options.audit.record({
      kind,
      detail: `${detailPrefix} allow-once grant ${grant.grant_id}.`,
      session_key: grant.session_key,
      tool_name: grant.tool_name,
      pending_action_id: grant.pending_action_id,
      action_fingerprint: grant.action_fingerprint,
    });
  }

  private restoreSnapshot(): void {
    if (!this.options.snapshotFilePath || !existsSync(this.options.snapshotFilePath)) {
      return;
    }

    try {
      const raw = readFileSync(this.options.snapshotFilePath, 'utf8');
      const snapshot = JSON.parse(raw) as Partial<SnapshotPayload>;
      const now = toIsoString(this.options.clock.now());

      for (const entry of snapshot.pendingActions ?? []) {
        if (
          (entry.status === 'pending' || entry.status === 'approved_waiting_retry') &&
          entry.expires_at > now
        ) {
          this.pendingActions.set(entry.pending_action_id, clonePendingAction(entry));
          this.pendingActionStates.set(entry.pending_action_id, entry.status);
        } else if (entry.pending_action_id) {
          this.pendingActionStates.set(entry.pending_action_id, 'expired');
          this.options.audit.record({
            kind: 'expired',
            detail: `Dropped expired pending action ${entry.pending_action_id} during recovery.`,
            session_key: entry.session_key,
            run_id: entry.run_id,
            tool_call_id: entry.tool_call_id,
            tool_name: entry.tool_name,
            pending_action_id: entry.pending_action_id,
            action_fingerprint: entry.action_fingerprint,
          });
        }
      }

      for (const grant of snapshot.allowOnceGrants ?? []) {
        if (grant.expires_at > now) {
          this.allowOnceGrants.set(grant.grant_id, cloneGrant(grant));
          this.grantStates.set(grant.grant_id, 'issued');
        } else if (grant.grant_id) {
          this.grantStates.set(grant.grant_id, 'expired');
          this.options.audit.record({
            kind: 'expired',
            detail: `Dropped expired allow-once grant ${grant.grant_id} during recovery.`,
            session_key: grant.session_key,
            tool_name: grant.tool_name,
            pending_action_id: grant.pending_action_id,
            action_fingerprint: grant.action_fingerprint,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.audit.record({
        kind: 'recovery_error',
        detail: `Failed to restore persisted ClawGuard state: ${message}`,
      });
    }
  }

  private persistSnapshot(): void {
    if (!this.options.snapshotFilePath) {
      return;
    }

    const snapshot: SnapshotPayload = {
      version: 1,
      pendingActions: [...this.pendingActions.values()].map(clonePendingAction),
      allowOnceGrants: [...this.allowOnceGrants.values()].map(cloneGrant),
    };

    const directory = path.dirname(this.options.snapshotFilePath);
    mkdirSync(directory, { recursive: true });
    const tempPath = `${this.options.snapshotFilePath}.tmp`;
    try {
      writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
      renameSync(tempPath, this.options.snapshotFilePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.audit.record({
        kind: 'persistence_error',
        detail: `Failed to persist ClawGuard live state: ${message}`,
      });
    }
  }
}
