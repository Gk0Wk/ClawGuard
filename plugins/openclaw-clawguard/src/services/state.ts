import {
  PipelineKind,
  ApprovalActorType,
  ApprovalResultStatus,
  ResponseAction,
  ToolStatus,
  applyApprovalResultToEvaluationArtifacts,
  applyPostExecutionResultToEvaluationArtifacts,
  buildOpenClawEvaluationArtifacts,
  type ApprovalResult,
  type ApprovalIntegratedArtifacts,
  type EvaluationArtifacts,
} from 'clawguard';
import type {
  Clock,
  HookDecision,
  MessageSentSnapshot,
  MessageSendingDecision,
  MessageSendingSnapshot,
  PendingAction,
} from '../types.js';
import { AuditLog } from './audit.js';
import { createId, fingerprintAction, toIsoString } from '../utils.js';
import { DEFAULT_LIMITS, normalizeLimit, type ClawGuardLimits } from './limits.js';
import {
  StateRepository,
  type PendingActionMutationResult,
} from './state-repository.js';

export interface ClawGuardPluginConfig {
  readonly approvalTtlSeconds: number;
  readonly pendingActionLimit: number;
  readonly allowOnceGrantLimit: number;
  readonly snapshotFilePath?: string;
}

export interface ToolContextSnapshot {
  readonly toolName: string;
  readonly params: Record<string, unknown>;
  readonly runId?: string;
  readonly toolCallId?: string;
  readonly sessionKey?: string;
  readonly sessionId?: string;
  readonly agentId?: string;
}

export interface ToolResultSnapshot extends ToolContextSnapshot {
  readonly result?: unknown;
  readonly error?: string;
  readonly durationMs?: number;
}

interface TrackedToolExecution {
  readonly pending_action_id?: string;
  readonly action_fingerprint: string;
  readonly artifacts: EvaluationArtifacts | ApprovalIntegratedArtifacts;
}

const defaultClock: Clock = {
  now: () => new Date(),
};

export class ClawGuardState {
  public readonly audit: AuditLog;

  public readonly pendingActions: {
    list(): PendingAction[];
    getById(pendingActionId: string): PendingAction | undefined;
  };

  public readonly allowOnce: {
    list(): ReturnType<StateRepository['listAllowOnceGrants']>;
  };

  private readonly repository: StateRepository;

  private readonly trackedExecutions = new Map<string, TrackedToolExecution>();

  public constructor(
    public readonly config: ClawGuardPluginConfig,
    private readonly clock: Clock = defaultClock,
  ) {
    this.audit = new AuditLog(this.clock);
    this.repository = new StateRepository({
      clock: this.clock,
      audit: this.audit,
      approvalTtlSeconds: config.approvalTtlSeconds,
      limits: {
        pendingActions: config.pendingActionLimit,
        allowOnceGrants: config.allowOnceGrantLimit,
      },
      snapshotFilePath: config.snapshotFilePath,
    });
    this.pendingActions = {
      list: () => this.repository.listPendingActions(),
      getById: (pendingActionId) => this.repository.getPendingActionById(pendingActionId),
    };
    this.allowOnce = {
      list: () => this.repository.listAllowOnceGrants(),
    };
  }

  public evaluateBeforeToolCall(input: ToolContextSnapshot): HookDecision {
    const toolName = normalizeToolName(input.toolName);
    const actionFingerprint = fingerprintAction({
      toolName,
      params: input.params,
    });
    const correlationKey = buildExecutionCorrelationKey(input, toolName, actionFingerprint);
    const artifacts = buildGuardedEvaluationArtifacts(input, toolName);
    if (!artifacts) {
      this.trackedExecutions.delete(correlationKey);
      return { block: false };
    }

    const sessionKey = artifacts.session_ref.session_key;
    const runId = artifacts.run_ref.run_id;
    const toolCallId = artifacts.tool_call_ref.tool_call_id;

    if (
      artifacts.policy_decision.decision === ResponseAction.ApproveRequired ||
      artifacts.policy_decision.decision === ResponseAction.Block
    ) {
      this.audit.record({
        kind: 'risk_hit',
        detail: buildRiskHitDetail(artifacts),
        session_key: sessionKey,
        run_id: runId,
        tool_call_id: toolCallId,
        tool_name: toolName,
        action_fingerprint: actionFingerprint,
      });
    }

    if (artifacts.policy_decision.decision === ResponseAction.Block) {
      this.trackedExecutions.delete(correlationKey);
      this.audit.record({
        kind: 'blocked',
        detail: buildBeforeBlockDetail(artifacts),
        session_key: sessionKey,
        run_id: runId,
        tool_call_id: toolCallId,
        tool_name: toolName,
        action_fingerprint: actionFingerprint,
      });
      return {
        block: true,
        blockReason: this.buildImmediateBlockMessage(artifacts),
      };
    }

    if (artifacts.policy_decision.decision !== ResponseAction.ApproveRequired) {
      this.trackExecution(correlationKey, actionFingerprint, artifacts);
      return { block: false };
    }

    const grantResult = this.repository.consumeMatchingGrant({
      session_key: sessionKey,
      tool_name: toolName,
      action_fingerprint: actionFingerprint,
    });
    if (grantResult.ok) {
      const approvalIntegrated = applyApprovalResultToEvaluationArtifacts(
        artifacts,
        createSyntheticApprovalResult(artifacts, grantResult),
      );
      this.audit.record({
        kind: 'allow_once_consumed',
        detail: `Consumed allow-once grant ${grantResult.grant.grant_id} for ${toolName}.`,
        session_key: sessionKey,
        run_id: runId,
        tool_call_id: toolCallId,
        tool_name: toolName,
        pending_action_id: grantResult.grant.pending_action_id,
        action_fingerprint: actionFingerprint,
      });
      this.trackExecution(
        correlationKey,
        actionFingerprint,
        approvalIntegrated,
        grantResult.grant.pending_action_id,
      );
      return { block: false };
    }

    const existing = this.repository.findLivePendingByFingerprint({
      session_key: sessionKey,
      tool_name: toolName,
      action_fingerprint: actionFingerprint,
    });
    if (existing) {
      this.trackedExecutions.delete(correlationKey);
      return {
        block: true,
        blockReason: this.buildBlockedMessage(existing, artifacts),
      };
    }

    const pendingAction = this.repository.createPendingAction({
      session_key: sessionKey,
      session_id: artifacts.session_ref.session_id,
      agent_id: artifacts.session_ref.agent_id,
      run_id: runId,
      tool_call_id: toolCallId,
      tool_name: toolName,
      action_title: artifacts.approval_request?.action_title,
      params: input.params,
      action_fingerprint: actionFingerprint,
      decision: 'approve_required',
      reason_summary: artifacts.approval_request?.reason_summary ?? artifacts.policy_decision.reason,
      reason_code: artifacts.policy_decision.reason_code,
      risk_level: artifacts.risk_event.severity,
      impact_scope: buildImpactScope(artifacts),
      guidance_summary: artifacts.risk_event.summary,
    });

    this.trackedExecutions.delete(correlationKey);
    this.audit.record({
      kind: 'pending_action_created',
      detail: `Created pending approval ${pendingAction.pending_action_id} for ${toolName}. ${artifacts.policy_decision.reason}`,
      session_key: sessionKey,
      run_id: runId,
      tool_call_id: toolCallId,
      tool_name: toolName,
      pending_action_id: pendingAction.pending_action_id,
      action_fingerprint: actionFingerprint,
    });
    this.audit.record({
      kind: 'blocked',
      detail: buildPendingBlockDetail(artifacts, pendingAction.pending_action_id),
      session_key: sessionKey,
      run_id: runId,
      tool_call_id: toolCallId,
      tool_name: toolName,
      pending_action_id: pendingAction.pending_action_id,
      action_fingerprint: actionFingerprint,
    });

    return {
      block: true,
      blockReason: this.buildBlockedMessage(pendingAction, artifacts),
    };
  }

  public evaluateMessageSending(input: MessageSendingSnapshot): MessageSendingDecision {
    const toolName = normalizeToolName('message_sending');
    const params = buildHostOutboundToolParams(input);
    const actionFingerprint = fingerprintAction({
      toolName,
      params,
    });
    const artifacts = buildHostOutboundEvaluationArtifacts(input, params);

    if (!shouldHardBlockHostOutbound(artifacts.policy_decision.decision)) {
      return { cancel: false };
    }

    this.audit.record({
      kind: 'risk_hit',
      detail: buildRiskHitDetail(artifacts),
      session_key: artifacts.session_ref.session_key,
      run_id: artifacts.run_ref.run_id,
      tool_call_id: artifacts.tool_call_ref.tool_call_id,
      tool_name: toolName,
      action_fingerprint: actionFingerprint,
    });
    this.audit.record({
      kind: 'blocked',
      detail: buildHostOutboundBlockDetail(artifacts),
      session_key: artifacts.session_ref.session_key,
      run_id: artifacts.run_ref.run_id,
      tool_call_id: artifacts.tool_call_ref.tool_call_id,
      tool_name: toolName,
      action_fingerprint: actionFingerprint,
    });

    return { cancel: true };
  }

  public finalizeMessageSent(input: MessageSentSnapshot): void {
    const toolName = normalizeToolName('message_sending');
    const params = buildHostOutboundToolParams(input);
    const actionFingerprint = fingerprintAction({
      toolName,
      params,
    });
    const artifacts = buildHostOutboundEvaluationArtifacts(input, params);
    if (shouldHardBlockHostOutbound(artifacts.policy_decision.decision)) {
      return;
    }
    const integrated = applyPostExecutionResultToEvaluationArtifacts(artifacts, {
      tool_status: input.success ? ToolStatus.Completed : ToolStatus.Failed,
      timestamp: toIsoString(this.clock.now()),
      summary: buildHostOutboundSummary(input),
    });
    const finalKind = mapFinalStatusToAuditKind(integrated.audit_record.final_status);
    if (!finalKind) {
      return;
    }

    this.audit.record({
      kind: finalKind,
      detail: buildHostOutboundFinalOutcomeDetail(integrated),
      session_key: integrated.session_ref.session_key,
      run_id: integrated.run_ref.run_id,
      tool_call_id: integrated.tool_call_ref.tool_call_id,
      tool_name: integrated.tool_call_ref.tool_name,
      action_fingerprint: actionFingerprint,
    });
  }

  public finalizeAfterToolCall(input: ToolResultSnapshot): void {
    this.finalizeTrackedToolResult(input, {
      acceptedPipelines: [PipelineKind.Exec, PipelineKind.Outbound, PipelineKind.WorkspaceMutation],
    });
  }

  public finalizeToolResultPersist(input: ToolResultSnapshot): void {
    this.finalizeTrackedToolResult(input, {
      acceptedPipelines: [PipelineKind.WorkspaceMutation],
    });
  }

  private finalizeTrackedToolResult(
    input: ToolResultSnapshot,
    options: {
      readonly acceptedPipelines: ReadonlyArray<PipelineKind>;
    },
  ): void {
    const toolName = normalizeToolName(input.toolName);
    const actionFingerprint = fingerprintAction({
      toolName,
      params: input.params,
    });
    const correlationKey = buildExecutionCorrelationKey(input, toolName, actionFingerprint);
    const tracked = this.trackedExecutions.get(correlationKey);
    if (!tracked) {
      return;
    }

    if (!options.acceptedPipelines.includes(tracked.artifacts.routing.pipeline_kind)) {
      return;
    }

    this.trackedExecutions.delete(correlationKey);

    const resultSummary = buildAfterSummary(input);
    const integrated = applyPostExecutionResultToEvaluationArtifacts(tracked.artifacts, {
      tool_status: deriveAfterToolStatus(input),
      timestamp: toIsoString(this.clock.now()),
      summary: resultSummary,
    });
    const finalKind = mapFinalStatusToAuditKind(integrated.audit_record.final_status);
    if (!finalKind) {
      return;
    }

    this.audit.record({
      kind: finalKind,
      detail: buildFinalOutcomeDetail(integrated, resultSummary),
      session_key: integrated.session_ref.session_key,
      run_id: integrated.run_ref.run_id,
      tool_call_id: integrated.tool_call_ref.tool_call_id,
      tool_name: integrated.tool_call_ref.tool_name,
      pending_action_id: tracked.pending_action_id,
      action_fingerprint: tracked.action_fingerprint,
    });
  }

  public approvePendingAction(pendingActionId: string): PendingActionMutationResult {
    const result = this.repository.approvePendingAction(pendingActionId);
    if (!result.ok && result.reason === 'invalid_transition') {
      this.recordInvalidTransition('approve', pendingActionId, result.currentState);
    }
    if (!result.ok) {
      return result;
    }

    this.audit.record({
      kind: 'approved',
      detail: `Approved pending action ${result.pendingAction.pending_action_id}.`,
      session_key: result.pendingAction.session_key,
      run_id: result.pendingAction.run_id,
      tool_call_id: result.pendingAction.tool_call_id,
      tool_name: result.pendingAction.tool_name,
      pending_action_id: result.pendingAction.pending_action_id,
      action_fingerprint: result.pendingAction.action_fingerprint,
    });
    if (result.grant) {
      this.audit.record({
        kind: 'allow_once_issued',
        detail: `Issued allow-once grant ${result.grant.grant_id}.`,
        session_key: result.grant.session_key,
        run_id: result.pendingAction.run_id,
        tool_call_id: result.pendingAction.tool_call_id,
        tool_name: result.grant.tool_name,
        pending_action_id: result.grant.pending_action_id,
        action_fingerprint: result.grant.action_fingerprint,
      });
    }

    return result;
  }

  public denyPendingAction(pendingActionId: string): PendingActionMutationResult {
    const result = this.repository.denyPendingAction(pendingActionId);
    if (!result.ok && result.reason === 'invalid_transition') {
      this.recordInvalidTransition('deny', pendingActionId, result.currentState);
    }
    if (!result.ok) {
      return result;
    }

    this.audit.record({
      kind: 'denied',
      detail: `Denied pending action ${result.pendingAction.pending_action_id}.`,
      session_key: result.pendingAction.session_key,
      run_id: result.pendingAction.run_id,
      tool_call_id: result.pendingAction.tool_call_id,
      tool_name: result.pendingAction.tool_name,
      pending_action_id: result.pendingAction.pending_action_id,
      action_fingerprint: result.pendingAction.action_fingerprint,
    });

    return result;
  }

  private trackExecution(
    correlationKey: string,
    actionFingerprint: string,
    artifacts: EvaluationArtifacts | ApprovalIntegratedArtifacts,
    pendingActionId?: string,
  ): void {
    this.trackedExecutions.set(correlationKey, {
      pending_action_id: pendingActionId,
      action_fingerprint: actionFingerprint,
      artifacts,
    });
  }

  private buildBlockedMessage(
    pendingAction: PendingAction,
    artifacts?: EvaluationArtifacts,
  ): string {
    const reason =
      pendingAction.reason_summary || artifacts?.approval_request?.reason_summary || artifacts?.policy_decision.reason;
    const guidance = pendingAction.guidance_summary || artifacts?.risk_event.summary;
    const impactScope = pendingAction.impact_scope || (artifacts ? buildImpactScope(artifacts) : undefined);

    return [
      'ClawGuard paused this action and queued it for approval.',
      reason ? `Reason: ${reason}` : undefined,
      guidance ? `Guidance: ${guidance}` : undefined,
      impactScope ? `Impact scope: ${impactScope}` : undefined,
      `Pending action: ${pendingAction.pending_action_id}`,
      'Review it at: /plugins/clawguard/approvals',
      `After approval, retry the same ${pendingAction.tool_name} call once within ${this.config.approvalTtlSeconds} seconds.`,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n');
  }

  private buildImmediateBlockMessage(artifacts: EvaluationArtifacts): string {
    return [
      'ClawGuard blocked this action.',
      `Reason: ${artifacts.policy_decision.reason}`,
      `Guidance: ${artifacts.risk_event.summary}`,
      buildImpactScope(artifacts) ? `Impact scope: ${buildImpactScope(artifacts)}` : undefined,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n');
  }

  private recordInvalidTransition(
    action: 'approve' | 'deny',
    pendingActionId: string,
    currentState?: string,
  ): void {
    this.audit.record({
      kind: 'invalid_transition',
      detail: `Rejected ${action} for pending action ${pendingActionId}${
        currentState ? ` from state ${currentState}` : ''
      }.`,
      pending_action_id: pendingActionId,
    });
  }
}

export function createClawGuardState(
  config?: Partial<ClawGuardPluginConfig>,
  clock?: Clock,
): ClawGuardState {
  const limits: ClawGuardLimits = {
    pendingActions: normalizeLimit(config?.pendingActionLimit, DEFAULT_LIMITS.pendingActions),
    allowOnceGrants: normalizeLimit(
      config?.allowOnceGrantLimit,
      DEFAULT_LIMITS.allowOnceGrants,
    ),
  };

  return new ClawGuardState(
    {
      approvalTtlSeconds: config?.approvalTtlSeconds ?? 900,
      pendingActionLimit: limits.pendingActions,
      allowOnceGrantLimit: limits.allowOnceGrants,
      snapshotFilePath: config?.snapshotFilePath,
    },
    clock,
  );
}

function buildGuardedEvaluationArtifacts(
  input: ToolContextSnapshot,
  toolName: string,
): EvaluationArtifacts | undefined {
  const artifacts = buildOpenClawEvaluationArtifacts({
    before_tool_call: {
      event: {
        toolName,
        params: input.params,
        runId: input.runId,
        toolCallId: input.toolCallId,
      },
      context: {
        sessionKey: input.sessionKey,
        sessionId: input.sessionId,
        agentId: input.agentId,
        runId: input.runId,
        toolCallId: input.toolCallId,
      },
    },
    session_policy: {
      sessionKey: input.sessionKey,
      sessionId: input.sessionId,
      agentId: input.agentId,
    },
  });

  return (
    artifacts.routing.pipeline_kind === 'exec' ||
    artifacts.routing.pipeline_kind === 'outbound' ||
    artifacts.routing.pipeline_kind === 'workspace_mutation'
  )
    ? artifacts
    : undefined;
}

function createSyntheticApprovalResult(
  artifacts: EvaluationArtifacts,
  grantResult: Extract<ReturnType<StateRepository['consumeMatchingGrant']>, { readonly ok: true }>,
): ApprovalResult {
  return {
    approval_result_id: createId('approval-result'),
    approval_request_id: artifacts.approval_request!.approval_request_id,
    event_id: artifacts.approval_request!.event_id,
    decision_id: artifacts.approval_request!.decision_id,
    result: ApprovalResultStatus.Approved,
    actor_type: ApprovalActorType.User,
    acted_at:
      grantResult.pendingAction?.approved_at ??
      grantResult.grant.issued_at,
    remembered: false,
  };
}

function buildExecutionCorrelationKey(
  input: ToolContextSnapshot,
  toolName: string,
  actionFingerprint: string,
): string {
  return [
    input.sessionKey ?? 'session-unknown',
    input.runId ?? 'run-unknown',
    input.toolCallId ?? 'toolcall-unknown',
    toolName,
    actionFingerprint,
  ].join('|');
}

function buildImpactScope(artifacts: EvaluationArtifacts): string | undefined {
  return (
    artifacts.approval_request?.impact_scope ??
    artifacts.evaluation_input.destination?.target ??
    artifacts.evaluation_input.workspace_context?.paths[0] ??
    readCommand(artifacts.evaluation_input.tool_params)
  );
}

function buildRiskHitDetail(artifacts: EvaluationArtifacts): string {
  return `${artifacts.policy_decision.reason} ${artifacts.risk_event.summary}`.trim();
}

function buildBeforeBlockDetail(artifacts: EvaluationArtifacts): string {
  return `Blocked before execution. ${artifacts.policy_decision.reason} ${artifacts.risk_event.summary}`.trim();
}

function buildPendingBlockDetail(
  artifacts: EvaluationArtifacts,
  pendingActionId: string,
): string {
  return `Blocked before execution and queued ${pendingActionId}. ${artifacts.policy_decision.reason} ${artifacts.risk_event.summary}`.trim();
}

function buildHostOutboundBlockDetail(artifacts: EvaluationArtifacts): string {
  const deliveryPosture =
    artifacts.policy_decision.decision === ResponseAction.ApproveRequired
      ? 'Direct host outbound cannot enter the pending approval loop, so ClawGuard kept the host send on the hard-block path.'
      : 'Direct host outbound matched an immediate block rule.'

  return `Blocked host outbound delivery before channel send. ${deliveryPosture} ${artifacts.policy_decision.reason} ${artifacts.risk_event.summary}`.trim();
}

function buildHostOutboundSummary(input: MessageSentSnapshot): string {
  if (!input.success) {
    return input.error?.trim() || 'host outbound delivery failed';
  }

  return 'host outbound delivered';
}

function deriveAfterToolStatus(input: ToolResultSnapshot): ToolStatus {
  if (typeof input.error === 'string' && input.error.trim().length > 0) {
    return ToolStatus.Failed;
  }

  if (isBlockedResult(input.result)) {
    return ToolStatus.Blocked;
  }

  return ToolStatus.Completed;
}

function buildAfterSummary(input: ToolResultSnapshot): string {
  const structuredResultSummary = summarizeStructuredToolResult(input.result);
  if (structuredResultSummary) {
    return structuredResultSummary;
  }

  if (typeof input.error === 'string' && input.error.trim().length > 0) {
    return input.error.trim();
  }

  if (typeof input.result === 'string' && input.result.trim().length > 0) {
    return input.result.trim();
  }

  if (isBlockedResult(input.result)) {
    return 'tool reported a blocked outcome';
  }

  return 'tool completed';
}

export function summarizeStructuredToolResult(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') {
    return undefined;
  }

  const record = result as Record<string, unknown>;
  const summary =
    readOptionalString(record.summary) ??
    readOptionalString(record.message) ??
    readOptionalString(record.result);
  const operationType =
    readOptionalString(record.operationType) ??
    readOptionalString(record.operation_type);
  const status = readOptionalString(record.status);
  const paths = [
    readOptionalString(record.path),
    readOptionalString(record.filePath),
    readOptionalString(record.patchPath),
    ...readOptionalStringArray(record.paths),
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

  if (summary) {
    const summarySegments = [
      summary,
      operationType ? `operation type=${operationType}` : undefined,
      status ? `tool result status=${status}` : undefined,
      paths.length > 0 ? `paths=${paths.join(', ')}` : undefined,
    ].filter((value): value is string => Boolean(value));

    return summarySegments.join('; ').trim();
  }

  if (!operationType && !status && paths.length === 0) {
    return undefined;
  }

  const segments = [
    operationType ? `operation type=${operationType}` : undefined,
    status ? `tool result status=${status}` : undefined,
    paths.length > 0 ? `paths=${paths.join(', ')}` : undefined,
  ].filter((value): value is string => Boolean(value));

  return segments.length > 0 ? segments.join('; ') : undefined;
}

function isBlockedResult(result: unknown): boolean {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const blocked =
    'blocked' in result && result.blocked === true
      ? true
      : 'status' in result && typeof result.status === 'string'
        ? result.status.trim().toLowerCase() === 'blocked'
        : false;

  return blocked;
}

function mapFinalStatusToAuditKind(
  finalStatus: 'allowed' | 'blocked' | 'constrained' | 'failed' | 'logged',
): 'allowed' | 'blocked' | 'failed' | undefined {
  switch (finalStatus) {
    case 'allowed':
      return 'allowed';
    case 'blocked':
      return 'blocked';
    case 'failed':
      return 'failed';
    default:
      return undefined;
  }
}

function buildFinalOutcomeDetail(
  artifacts: ReturnType<typeof applyPostExecutionResultToEvaluationArtifacts>,
  resultSummary?: string,
): string {
  const resolvedResultSummary = resultSummary ?? artifacts.evaluation_input.agent_event?.summary;
  const routeMode = artifacts.evaluation_input.destination?.target_mode;

  return [
    `Final outcome ${artifacts.audit_record.final_status} after execution.`,
    routeMode ? `Route mode=${routeMode}.` : undefined,
    artifacts.policy_decision.reason,
    artifacts.risk_event.summary,
    resolvedResultSummary ? `Result detail: ${resolvedResultSummary}` : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .trim();
}

function buildHostOutboundFinalOutcomeDetail(
  artifacts: ReturnType<typeof applyPostExecutionResultToEvaluationArtifacts>,
): string {
  return [
    `Final outbound outcome ${artifacts.audit_record.final_status} after host delivery.`,
    artifacts.policy_decision.reason,
    artifacts.risk_event.summary,
    artifacts.evaluation_input.agent_event?.summary ? `Result detail: ${artifacts.evaluation_input.agent_event.summary}` : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .trim();
}

function buildHostOutboundEvaluationArtifacts(
  input: Pick<
    MessageSendingSnapshot,
    'to' | 'content' | 'channelId' | 'accountId' | 'conversationId' | 'metadata'
  >,
  params: Record<string, unknown>,
): EvaluationArtifacts {
  const sessionKey = buildHostOutboundSessionKey(input);
  const thread = readHostOutboundThread(input.metadata);
  const toolName = 'message_sending';
  const actionFingerprint = fingerprintAction({
    toolName,
    params,
  });
  const runId = buildHostOutboundActionId('host-outbound-run', sessionKey, toolName, actionFingerprint);
  const toolCallId = buildHostOutboundActionId(
    'host-outbound-call',
    sessionKey,
    toolName,
    actionFingerprint,
  );

  return buildOpenClawEvaluationArtifacts({
    before_tool_call: {
      event: {
        toolName: 'message_sending',
        params,
        runId,
        toolCallId,
      },
      context: {
        sessionKey,
        runId,
        toolCallId,
      },
    },
    session_policy: {
      sessionKey,
      origin: {
        channel: input.channelId,
        to: input.conversationId ?? input.to,
        ...(thread ? { thread } : {}),
      },
    },
  });
}

function buildHostOutboundToolParams(input: MessageSendingSnapshot): Record<string, unknown> {
  const thread = readHostOutboundThread(input.metadata);

  return {
    to: input.to,
    message: input.content,
    channelId: input.channelId,
    ...(input.accountId ? { accountId: input.accountId } : {}),
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    ...(thread ? { thread } : {}),
  };
}

function buildHostOutboundSessionKey(input: MessageSendingSnapshot): string {
  return [
    'host-outbound',
    normalizeSessionKeySegment(input.channelId),
    normalizeSessionKeySegment(input.accountId ?? 'default'),
    normalizeSessionKeySegment(input.conversationId ?? input.to),
  ].join(':');
}

function buildHostOutboundActionId(
  prefix: string,
  sessionKey: string,
  toolName: string,
  actionFingerprint: string,
): string {
  const stableId = fingerprintAction({
    toolName: `${prefix}:${toolName}`,
    params: {
      sessionKey,
      actionFingerprint,
    },
  });
  return `${prefix}_${stableId.slice(0, 16)}`;
}

function readHostOutboundThread(metadata: Record<string, unknown> | undefined): string | undefined {
  const value = metadata?.threadTs ?? metadata?.threadId ?? metadata?.thread;
  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readCommand(toolParams: Record<string, unknown>): string | undefined {
  return typeof toolParams.command === 'string' ? toolParams.command.trim() : undefined;
}

function normalizeSessionKeySegment(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.replace(/[^a-z0-9._-]+/g, '_');
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readOptionalStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => readOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function normalizeToolName(toolName: string): string {
  return toolName.trim().toLowerCase();
}

function shouldHardBlockHostOutbound(decision: ResponseAction): boolean {
  return decision === ResponseAction.Block || decision === ResponseAction.ApproveRequired;
}
