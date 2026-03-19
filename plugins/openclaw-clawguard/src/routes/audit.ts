import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuditEntry, AuditEntryKind } from '../types.js';
import { escapeHtml } from '../utils.js';
import type { ClawGuardState } from '../services/state.js';
import {
  APPROVALS_ROUTE_PATH,
  AUDIT_ROUTE_PATH,
  CHECKUP_ROUTE_PATH,
  DASHBOARD_ROUTE_PATH,
  INSTALL_DEMO,
  renderAuditFlowHandoffCopy,
  renderAuditLiveQueueHintCopy,
  renderClawGuardNav,
  renderControlSurfaceIntro,
  renderInstallDemoPostureNote,
} from './shared.js';

type AuditKindGuide = {
  readonly title: string;
  readonly category: 'risk' | 'approval' | 'grant' | 'outcome' | 'error';
  readonly explanation: string;
  readonly systemAction: string;
  readonly userDecision: string;
  readonly finalOutcome: string;
};

type RouteMode = 'explicit' | 'implicit';
type AuditFlowOrigin = 'Approvals queue' | 'Direct host outbound' | 'Direct audit trail';

type TimelineEvent = {
  readonly recordId: string;
  readonly kind: AuditEntryKind;
  readonly category: AuditKindGuide['category'];
  readonly title: string;
  readonly timestamp: string;
  readonly timestampLabel: string;
  readonly detail: string;
  readonly toolName?: string;
  readonly pendingActionId?: string;
  readonly runId?: string;
  readonly explanation: string;
  readonly systemAction: string;
  readonly userDecision: string;
  readonly finalOutcome: string;
  readonly routeMode?: RouteMode;
};

type TimelineFlow = {
  readonly flowId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly startedAt: string;
  readonly startedAtLabel: string;
  readonly lastEventAt: string;
  readonly lastEventAtLabel: string;
  readonly toolName?: string;
  readonly pendingActionId?: string;
  readonly runId?: string;
  readonly origin: string;
  readonly riskDecision: string;
  readonly routeMode?: RouteMode;
  readonly systemAction: string;
  readonly userDecision: string;
  readonly finalOutcome: string;
  readonly inspectNext: string;
  readonly events: TimelineEvent[];
};

type AuditTimelinePayload = {
  readonly audit: AuditEntry[];
  readonly timeline: {
    readonly relationships: {
      readonly dashboard: string;
      readonly checkup: string;
      readonly approvals: string;
      readonly audit: string;
    };
    readonly posture: {
      readonly releaseStatus: string;
      readonly demoPosture: string;
      readonly navigationPosture: string;
    };
    readonly summary: {
      readonly totalEntries: number;
      readonly totalFlows: number;
      readonly approvalOriginFlows: number;
      readonly pendingApprovalFlows: number;
      readonly waitingRetryFlows: number;
      readonly approvedFlows: number;
      readonly deniedFlows: number;
      readonly allowedFlows: number;
      readonly blockedFlows: number;
      readonly failedFlows: number;
    };
    readonly kindGuide: ReadonlyArray<{ readonly kind: AuditEntryKind } & AuditKindGuide>;
    readonly flows: TimelineFlow[];
  };
};

const AUDIT_KIND_GUIDE: Record<AuditEntryKind, AuditKindGuide> = {
  risk_hit: {
    title: 'Risk hit recorded',
    category: 'risk',
    explanation:
      'ClawGuard saw a risk signal worth recording, even before the final replay settled.',
    systemAction: 'Captured the reason and linked it to the same action trail.',
    userDecision: 'No human decision recorded yet.',
    finalOutcome: 'Signal only. Look at later entries for the ending.',
  },
  pending_action_created: {
    title: 'Approval checkpoint created',
    category: 'approval',
    explanation:
      'ClawGuard opened a human review checkpoint because this action was too risky to continue automatically.',
    systemAction: 'Queued the action for review and saved the pending action ID for replay.',
    userDecision: 'Waiting for a human decision.',
    finalOutcome: 'Not final yet. The action is paused until approved, denied, or expired.',
  },
  approved: {
    title: 'User approved the action',
    category: 'approval',
    explanation:
      'A person explicitly allowed the queued action to move forward in the install demo.',
    systemAction: 'Marked the pending action as approved and prepared it for one controlled retry.',
    userDecision: 'Approved.',
    finalOutcome: 'Not final yet. Approval still needs a matching retry and an execution result.',
  },
  denied: {
    title: 'User denied the action',
    category: 'approval',
    explanation:
      'A person explicitly said no, so ClawGuard kept the risky action from moving forward.',
    systemAction: 'Closed the pending action as denied.',
    userDecision: 'Denied.',
    finalOutcome: 'Blocked by human decision.',
  },
  allow_once_issued: {
    title: 'One retry token issued',
    category: 'grant',
    explanation:
      'After approval, ClawGuard issued a one-time allow-once grant for the exact same action fingerprint.',
    systemAction: 'Created a short-lived single retry grant tied to that pending action.',
    userDecision: 'Approved earlier; this is the follow-up token.',
    finalOutcome: 'Still waiting for the retry to happen.',
  },
  allow_once_revoked: {
    title: 'One retry token revoked',
    category: 'grant',
    explanation:
      'A previously issued allow-once grant was withdrawn before it could be used again.',
    systemAction: 'Removed the grant so the exact same action can no longer reuse it.',
    userDecision: 'A later deny or cleanup removed the earlier approval path.',
    finalOutcome: 'Retry path closed.',
  },
  allow_once_consumed: {
    title: 'One retry token consumed',
    category: 'grant',
    explanation:
      'The approved retry actually came back, and ClawGuard matched it to the one-time grant.',
    systemAction: 'Spent the grant and let the single approved retry continue.',
    userDecision: 'Approved earlier; the approved retry is now in flight.',
    finalOutcome: 'Still waiting for the execution result.',
  },
  expired: {
    title: 'Approval artifact expired',
    category: 'error',
    explanation:
      'The pending action or grant aged out before the replay could finish within the demo TTL.',
    systemAction: 'Marked the stale artifact as expired.',
    userDecision: 'No fresh decision can be reused after expiry.',
    finalOutcome: 'Timed out without a completed replay.',
  },
  evicted: {
    title: 'Approval artifact evicted',
    category: 'error',
    explanation:
      'ClawGuard dropped an older approval artifact because the configured live limit was reached.',
    systemAction: 'Evicted older state to stay within the bounded demo limits.',
    userDecision: 'The earlier decision is no longer live.',
    finalOutcome: 'Replay continuity was cut off by capacity limits.',
  },
  allowed: {
    title: 'Action completed as allowed',
    category: 'outcome',
    explanation:
      'The action made it through the approval path or normal path and completed successfully.',
    systemAction: 'Recorded the final allowed outcome for the replay trail.',
    userDecision: 'Approved earlier if this was a queued action; otherwise no approval was needed.',
    finalOutcome: 'Allowed.',
  },
  failed: {
    title: 'Action failed after being allowed to run',
    category: 'outcome',
    explanation:
      'ClawGuard let the action proceed, but the tool or delivery still failed afterward.',
    systemAction: 'Captured the final failure so the replay shows that approval did not equal success.',
    userDecision: 'May have been approved earlier, but the runtime still failed.',
    finalOutcome: 'Failed.',
  },
  blocked: {
    title: 'Action was blocked',
    category: 'outcome',
    explanation:
      'ClawGuard stopped the action before completion, either immediately or as the final blocked result.',
    systemAction: 'Recorded the protective stop on the same audit trail.',
    userDecision: 'Either no approval was allowed or the flow ended in a protective stop.',
    finalOutcome: 'Blocked.',
  },
  invalid_transition: {
    title: 'Invalid approval transition',
    category: 'error',
    explanation:
      'Someone tried to approve or deny an action from a state that no longer allowed that move.',
    systemAction: 'Rejected the invalid state change and kept the audit trail.',
    userDecision: 'The attempted decision did not apply.',
    finalOutcome: 'No valid state change happened.',
  },
  recovery_error: {
    title: 'Recovery error recorded',
    category: 'error',
    explanation:
      'ClawGuard hit an error while trying to restore or recover bounded plugin state.',
    systemAction: 'Logged the recovery problem for operator review.',
    userDecision: 'No human decision changed the result here.',
    finalOutcome: 'Operational error recorded.',
  },
  persistence_error: {
    title: 'Persistence error recorded',
    category: 'error',
    explanation:
      'ClawGuard could not save or update part of its bounded plugin state correctly.',
    systemAction: 'Logged the persistence problem for later investigation.',
    userDecision: 'No human decision changed the result here.',
    finalOutcome: 'Operational error recorded.',
  },
};

function buildAuditPayload(state: ClawGuardState): AuditTimelinePayload {
  const audit = state.audit.list();
  const flows = buildTimelineFlows(audit);
  const flowOutcomes = flows.reduce(
    (summary, flow) => {
      if (flow.origin === 'Approvals queue') {
        summary.approvalOriginFlows += 1;
      }
      if (flow.userDecision === 'Waiting for decision') {
        summary.pendingApprovalFlows += 1;
      }
      if (flow.finalOutcome === 'Waiting for approved retry') {
        summary.waitingRetryFlows += 1;
      }
      if (flow.userDecision === 'Approved') {
        summary.approvedFlows += 1;
      }
      if (flow.userDecision === 'Denied') {
        summary.deniedFlows += 1;
      }
      if (flow.finalOutcome === 'Allowed') {
        summary.allowedFlows += 1;
      }
      if (flow.finalOutcome === 'Blocked') {
        summary.blockedFlows += 1;
      }
      if (flow.finalOutcome === 'Failed') {
        summary.failedFlows += 1;
      }
      return summary;
    },
    {
      approvalOriginFlows: 0,
      pendingApprovalFlows: 0,
      waitingRetryFlows: 0,
      approvedFlows: 0,
      deniedFlows: 0,
      allowedFlows: 0,
      blockedFlows: 0,
      failedFlows: 0,
    },
  );

  return {
    audit,
    timeline: {
      relationships: {
        dashboard: DASHBOARD_ROUTE_PATH,
        checkup: CHECKUP_ROUTE_PATH,
        approvals: APPROVALS_ROUTE_PATH,
        audit: AUDIT_ROUTE_PATH,
      },
      posture: {
        releaseStatus: INSTALL_DEMO.releaseStatus,
        demoPosture: INSTALL_DEMO.demoPosture,
        navigationPosture: INSTALL_DEMO.navigationPosture,
      },
      summary: {
        totalEntries: audit.length,
        totalFlows: flows.length,
        ...flowOutcomes,
      },
      kindGuide: (Object.entries(AUDIT_KIND_GUIDE) as Array<[AuditEntryKind, AuditKindGuide]>).map(
        ([kind, guide]) => ({
          kind,
          ...guide,
        }),
      ),
      flows,
    },
  };
}

function buildTimelineFlows(entries: AuditEntry[]): TimelineFlow[] {
  const groupedFlows = new Map<string, AuditEntry[]>();
  for (const entry of [...entries].reverse()) {
    const key = deriveFlowKey(entry);
    const existing = groupedFlows.get(key);
    if (existing) {
      existing.push(entry);
      continue;
    }
    groupedFlows.set(key, [entry]);
  }

  return [...groupedFlows.entries()]
    .map(([flowId, flowEntries]) => buildTimelineFlow(flowId, flowEntries))
    .sort((left, right) => right.lastEventAt.localeCompare(left.lastEventAt));
}

function buildTimelineFlow(flowId: string, entries: AuditEntry[]): TimelineFlow {
  const events = entries.map(toTimelineEvent);
  const firstEntry = entries[0];
  const lastEntry = entries[entries.length - 1];
  const toolName = firstDefined(entries.map((entry) => entry.tool_name));
  const pendingActionId = firstDefined(entries.map((entry) => entry.pending_action_id));
  const runId = firstDefined(entries.map((entry) => entry.run_id));
  const routeMode = summarizeFlowRouteMode(entries);
  const workspaceState = summarizeFlowWorkspaceState(entries);
  const userDecision = summarizeFlowUserDecision(entries);
  const finalOutcome = summarizeFlowOutcome(entries, userDecision);
  const origin = summarizeFlowOrigin(entries, pendingActionId);

  return {
    flowId,
    title: buildFlowTitle(toolName, pendingActionId, workspaceState),
    subtitle: buildFlowSubtitle(runId, pendingActionId),
    startedAt: firstEntry.timestamp,
    startedAtLabel: formatTimestamp(firstEntry.timestamp),
    lastEventAt: lastEntry.timestamp,
    lastEventAtLabel: formatTimestamp(lastEntry.timestamp),
    ...(toolName ? { toolName } : {}),
    ...(pendingActionId ? { pendingActionId } : {}),
    ...(runId ? { runId } : {}),
    origin,
    riskDecision: summarizeFlowRiskDecision(entries),
    ...(routeMode ? { routeMode } : {}),
    systemAction: summarizeFlowSystemAction(entries),
    userDecision,
    finalOutcome,
    inspectNext: summarizeFlowInspectNext(origin, userDecision, finalOutcome),
    events,
  };
}

function toTimelineEvent(entry: AuditEntry): TimelineEvent {
  const guide = AUDIT_KIND_GUIDE[entry.kind];
  const routeMode = readRouteModeFromDetail(entry.detail);
  return {
    recordId: entry.record_id,
    kind: entry.kind,
    category: guide.category,
    title: guide.title,
    timestamp: entry.timestamp,
    timestampLabel: formatTimestamp(entry.timestamp),
    detail: entry.detail,
    ...(routeMode ? { routeMode } : {}),
    ...(entry.tool_name ? { toolName: entry.tool_name } : {}),
    ...(entry.pending_action_id ? { pendingActionId: entry.pending_action_id } : {}),
    ...(entry.run_id ? { runId: entry.run_id } : {}),
    explanation: guide.explanation,
    systemAction: guide.systemAction,
    userDecision: guide.userDecision,
    finalOutcome: guide.finalOutcome,
  };
}

function deriveFlowKey(entry: AuditEntry): string {
  const correlationKey =
    [entry.run_id, entry.tool_call_id, entry.tool_name].filter(Boolean).join('|') || undefined;
  return entry.pending_action_id ?? entry.action_fingerprint ?? correlationKey ?? entry.record_id;
}

function summarizeFlowRiskDecision(entries: AuditEntry[]): string {
  if (entries.some((entry) => entry.kind === 'pending_action_created')) {
    return 'Approval required';
  }
  if (entries.some((entry) => entry.kind === 'risk_hit')) {
    return 'Risk signal recorded';
  }
  if (entries.some((entry) => entry.kind === 'blocked')) {
    return 'Direct protective block';
  }
  return 'Recorded action replay';
}

function summarizeFlowRouteMode(entries: AuditEntry[]): RouteMode | undefined {
  for (const entry of entries) {
    const routeMode = readRouteModeFromDetail(entry.detail);
    if (routeMode) {
      return routeMode;
    }
  }

  return undefined;
}

function summarizeFlowSystemAction(entries: AuditEntry[]): string {
  if (entries.some((entry) => entry.kind === 'allow_once_consumed')) {
    return 'Spent the one approved retry and let the matching action continue.';
  }
  if (entries.some((entry) => entry.kind === 'allow_once_issued')) {
    return 'Issued a one-time retry token after approval.';
  }
  if (entries.some((entry) => entry.kind === 'pending_action_created')) {
    return 'Queued the action for review before execution could continue.';
  }
  if (entries.some((entry) => entry.kind === 'blocked')) {
    return 'Stopped the action and wrote the protective result to audit.';
  }
  if (entries.some((entry) => entry.kind === 'allowed')) {
    return 'Recorded a successful completion on the audit trail.';
  }
  if (entries.some((entry) => entry.kind === 'failed')) {
    return 'Recorded that runtime completion still failed after the decision.';
  }
  return 'Recorded the action trail without changing the underlying audit model.';
}

function summarizeFlowUserDecision(entries: AuditEntry[]): string {
  if (entries.some((entry) => entry.kind === 'denied')) {
    return 'Denied';
  }
  if (entries.some((entry) => entry.kind === 'approved')) {
    return 'Approved';
  }
  if (entries.some((entry) => entry.kind === 'pending_action_created')) {
    return 'Waiting for decision';
  }
  return 'No human decision recorded';
}

function summarizeFlowOutcome(entries: AuditEntry[], userDecision: string): string {
  for (const entry of [...entries].reverse()) {
    if (entry.kind === 'allowed') {
      return 'Allowed';
    }
    if (entry.kind === 'failed') {
      return 'Failed';
    }
    if (entry.kind === 'blocked') {
      return 'Blocked';
    }
  }
  if (userDecision === 'Denied') {
    return 'Blocked';
  }
  if (entries.some((entry) => entry.kind === 'allow_once_issued')) {
    return 'Waiting for approved retry';
  }
  if (entries.some((entry) => entry.kind === 'pending_action_created')) {
    return 'Waiting for decision';
  }
  return 'No final outcome yet';
}

function summarizeFlowOrigin(entries: AuditEntry[], pendingActionId?: string): AuditFlowOrigin {
  if (
    pendingActionId ||
    entries.some((entry) =>
      ['pending_action_created', 'approved', 'denied', 'allow_once_issued', 'allow_once_revoked', 'allow_once_consumed'].includes(
        entry.kind,
      ),
    )
  ) {
    return 'Approvals queue';
  }

  if (entries.some((entry) => entry.tool_name === 'message_sending')) {
    return 'Direct host outbound';
  }

  return 'Direct audit trail';
}

function summarizeFlowInspectNext(origin: AuditFlowOrigin, userDecision: string, finalOutcome: string): string {
  if (origin !== 'Approvals queue') {
    if (origin === 'Direct host outbound') {
      return finalOutcome === 'No final outcome yet'
        ? 'Host-level direct outbound never enters Approvals. Inspect later entries here for the eventual delivery ending.'
        : `Host-level direct outbound never enters Approvals. Inspect ${finalOutcome} as the current replay ending.`;
    }

    return finalOutcome === 'No final outcome yet'
      ? 'Inspect later entries here for the eventual outcome.'
      : `Inspect ${finalOutcome} as the current replay ending.`;
  }

  if (userDecision === 'Waiting for decision') {
    return 'Still live in Approvals. After the queue item closes, inspect whether the replay ended blocked, expired, or moved into the approved retry path.';
  }

  if (finalOutcome === 'Waiting for approved retry') {
    return 'Retry the same tool call once from the operator workflow, then inspect Allowed, Blocked, or Failed here.';
  }

  if (userDecision === 'Denied') {
    return 'Inspect Blocked to confirm the deny decision closed the approval path.';
  }

  if (finalOutcome === 'Allowed') {
    return 'Inspect Allowed to confirm the approved retry completed successfully.';
  }

  if (finalOutcome === 'Failed') {
    return 'Inspect Failed to confirm the approved retry ran but did not succeed.';
  }

  if (finalOutcome === 'Blocked') {
    return 'Inspect Blocked to confirm the approval-originated replay still ended in a protective stop.';
  }

  return `Inspect ${finalOutcome} as the latest approval-originated replay ending.`;
}

function buildFlowTitle(toolName?: string, pendingActionId?: string, workspaceState?: string): string {
  const normalizedTool = toolName
    ? `${toolName} replay${workspaceState ? ` (${workspaceState})` : ''}`
    : 'Recorded replay';
  return pendingActionId ? `${normalizedTool} for pending approval` : normalizedTool;
}

function summarizeFlowWorkspaceState(entries: AuditEntry[]): string | undefined {
  for (const entry of [...entries].reverse()) {
    const workspaceState = readWorkspaceStateFromDetail(entry.detail);
    if (workspaceState) {
      return workspaceState;
    }
  }

  return undefined;
}

function buildFlowSubtitle(runId?: string, pendingActionId?: string): string {
  const parts = [
    pendingActionId ? `Pending action ${pendingActionId}` : undefined,
    runId ? `Run ${runId}` : undefined,
  ].filter((value): value is string => Boolean(value));

  return parts.join(' · ') || 'Grouped from the live audit trail';
}

function firstDefined(values: ReadonlyArray<string | undefined>): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0);
}

function readRouteModeFromDetail(detail: string): RouteMode | undefined {
  const match = detail.match(/\bRoute mode(?:=|:)\s*(explicit|implicit)\b/i);
  if (!match) {
    return undefined;
  }

  const routeMode = match[1]?.toLowerCase();
  return routeMode === 'explicit' || routeMode === 'implicit' ? routeMode : undefined;
}

function readWorkspaceStateFromDetail(detail: string): string | undefined {
  const workspaceStateMatch = detail.match(/\bworkspace result state=([a-z-]+)\b/i);
  if (workspaceStateMatch?.[1]) {
    return workspaceStateMatch[1].toLowerCase();
  }

  return detail.match(/\boperation type=([a-z-]+)\b/i)?.[1]?.toLowerCase();
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const hour = String(parsed.getUTCHours()).padStart(2, '0');
  const minute = String(parsed.getUTCMinutes()).padStart(2, '0');
  const second = String(parsed.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second} UTC`;
}

function renderAuditPage(payload: AuditTimelinePayload): string {
  const flowCards = payload.timeline.flows
    .map(
      (flow) => `
        <section class="audit-flow" id="flow-${escapeHtml(flow.flowId)}">
          <header class="audit-flow__header">
            <div>
              <p class="eyebrow">Replay flow</p>
              <h2>${escapeHtml(flow.title)}</h2>
              <p class="audit-flow__subtitle">${escapeHtml(flow.subtitle)}</p>
            </div>
            <div class="audit-flow__status-grid">
              <p><strong>Started:</strong> ${escapeHtml(flow.startedAtLabel)}</p>
              <p><strong>Last event:</strong> ${escapeHtml(flow.lastEventAtLabel)}</p>
              <p><strong>Origin:</strong> ${escapeHtml(flow.origin)}</p>
              <p><strong>Risk / decision:</strong> ${escapeHtml(flow.riskDecision)}</p>
              <p><strong>System did:</strong> ${escapeHtml(flow.systemAction)}</p>
              <p><strong>User decision:</strong> ${escapeHtml(flow.userDecision)}</p>
              <p><strong>Final outcome:</strong> ${escapeHtml(flow.finalOutcome)}</p>
              ${flow.routeMode ? `<p><strong>Route mode:</strong> ${escapeHtml(flow.routeMode)} route</p>` : ''}
              <p><strong>Inspect next:</strong> ${escapeHtml(flow.inspectNext)}</p>
            </div>
          </header>
          <p class="audit-flow__handoff">${
            flow.origin === 'Approvals queue'
              ? renderAuditFlowHandoffCopy(
                  'approvals',
                  flow.finalOutcome === 'Waiting for decision' ||
                    flow.finalOutcome === 'Waiting for approved retry',
                )
              : renderAuditFlowHandoffCopy(flow.origin === 'Direct host outbound' ? 'host-outbound' : 'direct', false)
          }</p>
          <ol class="audit-events">
            ${flow.events
              .map(
                (event, index) => `
                  <li class="audit-event audit-event--${escapeHtml(event.category)}">
                    <div class="audit-event__index">${index + 1}</div>
                    <div class="audit-event__body">
                      <p class="audit-event__meta">
                        <span class="badge">${escapeHtml(event.kind)}</span>
                        <strong>${escapeHtml(event.title)}</strong>
                        <time datetime="${escapeHtml(event.timestamp)}">${escapeHtml(event.timestampLabel)}</time>
                      </p>
                      <p>${escapeHtml(event.explanation)}</p>
                      <p><strong>System did:</strong> ${escapeHtml(event.systemAction)}</p>
                      <p><strong>User decision:</strong> ${escapeHtml(event.userDecision)}</p>
                      <p><strong>Final outcome:</strong> ${escapeHtml(event.finalOutcome)}</p>
                      ${event.routeMode ? `<p><strong>Route mode:</strong> ${escapeHtml(event.routeMode)} route</p>` : ''}
                      <p><strong>Recorded detail:</strong> ${escapeHtml(event.detail)}</p>
                      <p class="audit-event__footnote">
                        ${escapeHtml(
                          [
                            event.toolName ? `Tool ${event.toolName}` : undefined,
                            event.pendingActionId ? `Pending ${event.pendingActionId}` : undefined,
                            event.runId ? `Run ${event.runId}` : undefined,
                          ]
                            .filter((value): value is string => Boolean(value))
                            .join(' · ') || 'No extra correlation fields on this entry',
                        )}
                      </p>
                    </div>
                  </li>
                `,
              )
              .join('\n')}
          </ol>
        </section>
      `,
    )
    .join('\n');

  const kindGuideItems = payload.timeline.kindGuide
    .map(
      (guide) => `
        <article class="kind-guide-item">
          <p class="audit-event__meta">
            <span class="badge">${escapeHtml(guide.kind)}</span>
            <strong>${escapeHtml(guide.title)}</strong>
          </p>
          <p>${escapeHtml(guide.explanation)}</p>
          <p><strong>System did:</strong> ${escapeHtml(guide.systemAction)}</p>
          <p><strong>User decision:</strong> ${escapeHtml(guide.userDecision)}</p>
          <p><strong>Final outcome:</strong> ${escapeHtml(guide.finalOutcome)}</p>
        </article>
      `,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ClawGuard audit timeline</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: Arial, sans-serif; line-height: 1.5; margin: 2rem auto; max-width: 1100px; padding: 0 1rem 3rem; color: #111827; }
      nav { margin: 1rem 0 1.5rem; }
      nav a, nav strong { margin-right: 0.75rem; }
      .eyebrow { color: #4b5563; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; margin: 0 0 0.25rem; text-transform: uppercase; }
      .hero, .summary-grid article, .audit-flow, .kind-guide-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem 1.25rem; }
      .hero p:last-child, .kind-guide-item p:last-child, .audit-event__body p:last-child { margin-bottom: 0; }
      .summary-grid, .kind-guide, .audit-flow__status-grid { display: grid; gap: 0.75rem; }
      .summary-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin: 1.5rem 0; }
      .kind-guide { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin: 1rem 0 2rem; }
      .audit-timeline { display: grid; gap: 1rem; }
      .audit-flow__header { display: grid; gap: 1rem; margin-bottom: 1rem; }
      .audit-flow__handoff { color: #1f2937; margin: 0 0 1rem; }
      .audit-flow__subtitle { color: #4b5563; margin-top: 0.25rem; }
      .audit-flow__status-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      .audit-events { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
      .audit-event { display: grid; gap: 0.75rem; grid-template-columns: 2.5rem 1fr; align-items: start; }
      .audit-event__index { align-items: center; background: #111827; border-radius: 999px; color: white; display: inline-flex; font-size: 0.9rem; font-weight: 700; height: 2rem; justify-content: center; width: 2rem; }
      .audit-event__body { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 0.9rem 1rem; }
      .audit-event__meta { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-top: 0; }
      .audit-event__footnote { color: #4b5563; font-size: 0.9rem; }
      .badge { background: #e5e7eb; border-radius: 999px; display: inline-block; font-family: Consolas, monospace; font-size: 0.8rem; padding: 0.15rem 0.55rem; }
      .audit-event--approval .badge, .audit-event--grant .badge { background: #dbeafe; }
      .audit-event--outcome .badge { background: #dcfce7; }
      .audit-event--risk .badge, .audit-event--error .badge { background: #fee2e2; }
    </style>
  </head>
  <body>
    <h1>ClawGuard audit timeline</h1>
    ${renderControlSurfaceIntro(AUDIT_ROUTE_PATH)}
    ${renderClawGuardNav(AUDIT_ROUTE_PATH)}
    ${renderInstallDemoPostureNote()}
    <section class="hero">
      <p>Replay the fake-only audit entries ClawGuard already captured. Dashboard is the status view, Checkup is the explanation view, Approvals is the action view, and Audit reconstructs what actually happened over time.</p>
      <p>${renderAuditLiveQueueHintCopy()}</p>
      <p><strong>Current posture:</strong> ${escapeHtml(INSTALL_DEMO.demoPosture)}</p>
      <p><strong>Navigation posture:</strong> ${escapeHtml(INSTALL_DEMO.navigationPosture)}</p>
    </section>
    <section class="summary-grid" aria-label="Audit summary">
      <article>
        <h2>Trail size</h2>
        <p><strong>${payload.timeline.summary.totalEntries}</strong> audit entries grouped into <strong>${payload.timeline.summary.totalFlows}</strong> replay flows.</p>
      </article>
      <article>
        <h2>Approval handoffs</h2>
        <p>Approval-originated: <strong>${payload.timeline.summary.approvalOriginFlows}</strong> · Waiting for decision: <strong>${payload.timeline.summary.pendingApprovalFlows}</strong> · Waiting for retry: <strong>${payload.timeline.summary.waitingRetryFlows}</strong></p>
      </article>
      <article>
        <h2>Human decisions</h2>
        <p>Waiting: <strong>${payload.timeline.summary.pendingApprovalFlows}</strong> · Approved: <strong>${payload.timeline.summary.approvedFlows}</strong> · Denied: <strong>${payload.timeline.summary.deniedFlows}</strong></p>
      </article>
      <article>
        <h2>Final outcomes</h2>
        <p>Allowed: <strong>${payload.timeline.summary.allowedFlows}</strong> · Blocked: <strong>${payload.timeline.summary.blockedFlows}</strong> · Failed: <strong>${payload.timeline.summary.failedFlows}</strong></p>
      </article>
    </section>
    <section>
      <h2>How to read this replay</h2>
      <p>These explanations are presentation-only helpers layered on top of the existing audit entries. They do not add new hooks, new runtime capture, or new audit persistence.</p>
      <div class="kind-guide">
        ${kindGuideItems}
      </div>
    </section>
    <section>
      <h2>Timeline replay</h2>
      <p>Each grouped flow shows when the action started, whether it originated from Approvals, what ClawGuard did, what the user decided, and which final outcome to inspect next.</p>
      <div class="audit-timeline">
        ${flowCards || '<p>No audit entries yet.</p>'}
      </div>
    </section>
  </body>
</html>`;
}

export function createAuditRoute(state: ClawGuardState) {
  return (req: IncomingMessage, res: ServerResponse): true | void => {
    const url = new URL(req.url ?? AUDIT_ROUTE_PATH, 'http://localhost');
    if (url.pathname !== AUDIT_ROUTE_PATH) {
      return undefined;
    }

    const payload = buildAuditPayload(state);

    res.statusCode = 200;
    if (url.searchParams.get('format') === 'json') {
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload, null, 2));
      return true;
    }

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(renderAuditPage(payload));
    return true;
  };
}
