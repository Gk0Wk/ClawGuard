import type { EvaluationInput } from '../../domain/context/index.js';
import type { AuditRecord } from '../../domain/audit/index.js';
import type { PolicyDecision } from '../../domain/policy/index.js';
import type { RiskEvent } from '../../domain/risk/index.js';
import {
  AuditRecordFinalStatus,
  ExecutionStatus,
  ResponseAction,
  RiskDomain,
  RiskEventStatus,
  RiskEventType,
  RiskSeverity,
  RiskTriggerSource,
  ToolStatus,
} from '../../domain/shared/index.js';
import { createStableId, systemClock, type RuntimeClock } from '../../shared/index.js';
import type { NormalizeOpenClawInputsArgs } from '../../adapters/openclaw/normalization.js';
import { normalizeOpenClawInputs } from '../../adapters/openclaw/normalization.js';

export interface EvaluationArtifacts {
  readonly evaluation_input: EvaluationInput;
  readonly session_ref: EvaluationInput['session_ref'];
  readonly run_ref: EvaluationInput['run_ref'];
  readonly tool_call_ref: EvaluationInput['tool_call_ref'];
  readonly risk_event: RiskEvent;
  readonly policy_decision: PolicyDecision;
  readonly audit_record: AuditRecord;
}

export interface BuildEvaluationArtifactsArgs extends NormalizeOpenClawInputsArgs {}

export function buildOpenClawEvaluationArtifacts(args: BuildEvaluationArtifactsArgs): EvaluationArtifacts {
  const clock = args.clock ?? systemClock;
  const normalized = normalizeOpenClawInputs(args);
  const policy_decision = buildPolicyDecision(normalized.evaluation_input);
  const risk_event = buildRiskEvent(normalized.evaluation_input, policy_decision);
  const audit_record = buildAuditRecord(normalized.evaluation_input, risk_event, policy_decision, clock);

  return {
    evaluation_input: normalized.evaluation_input,
    session_ref: normalized.session_ref,
    run_ref: normalized.run_ref,
    tool_call_ref: normalized.tool_call_ref,
    risk_event,
    policy_decision,
    audit_record,
  };
}

function buildPolicyDecision(evaluationInput: EvaluationInput): PolicyDecision {
  const eventType = mapToolToEventType(evaluationInput.tool_name);

  if (eventType === RiskEventType.Outbound && evaluationInput.session_ref.send_policy === 'deny') {
    return {
      decision_id: createStableId('decision', evaluationInput.run_ref.run_id, evaluationInput.tool_call_ref.tool_call_id),
      decision: ResponseAction.Block,
      reason: 'Session send policy denies outbound delivery.',
      requires_approval: false,
      block_immediately: true,
      can_continue: false,
      can_remember: false,
    };
  }

  if (eventType === RiskEventType.Exec && evaluationInput.session_ref.exec_ask) {
    return {
      decision_id: createStableId('decision', evaluationInput.run_ref.run_id, evaluationInput.tool_call_ref.tool_call_id),
      decision: ResponseAction.ApproveRequired,
      reason: 'Session exec policy requires approval before execution.',
      requires_approval: true,
      block_immediately: false,
      can_continue: false,
      can_remember: true,
    };
  }

  return {
    decision_id: createStableId('decision', evaluationInput.run_ref.run_id, evaluationInput.tool_call_ref.tool_call_id),
    decision: ResponseAction.Allow,
    reason: 'No blocking or approval-only session policy matched this tool call.',
    requires_approval: false,
    block_immediately: false,
    can_continue: true,
    can_remember: false,
  };
}

function buildRiskEvent(evaluationInput: EvaluationInput, policyDecision: PolicyDecision): RiskEvent {
  const event_type = mapToolToEventType(evaluationInput.tool_name);
  const risk_domain = mapToolToRiskDomain(event_type);

  return {
    event_id: createStableId('event', evaluationInput.run_ref.run_id, evaluationInput.tool_call_ref.tool_call_id),
    event_type,
    risk_domain,
    trigger_source: RiskTriggerSource.BeforeToolCall,
    summary: buildSummary(evaluationInput, policyDecision),
    explanation: buildExplanation(evaluationInput, policyDecision),
    severity: mapDecisionToSeverity(policyDecision.decision),
    recommended_action: policyDecision.decision,
    status: resolveRiskEventStatus(policyDecision.decision, evaluationInput.tool_call_ref.tool_status),
    session_ref: evaluationInput.session_ref,
    run_ref: evaluationInput.run_ref,
    tool_call_ref: evaluationInput.tool_call_ref,
  };
}

function buildAuditRecord(
  evaluationInput: EvaluationInput,
  riskEvent: RiskEvent,
  policyDecision: PolicyDecision,
  clock: RuntimeClock,
): AuditRecord {
  const execution_result = mapToolStatusToExecutionResult(evaluationInput.tool_call_ref.tool_status, policyDecision.decision);

  return {
    record_id: createStableId('audit', evaluationInput.run_ref.run_id, evaluationInput.tool_call_ref.tool_call_id),
    event_id: riskEvent.event_id,
    decision_id: policyDecision.decision_id,
    tool_name: evaluationInput.tool_name,
    decision: policyDecision.decision,
    execution_result,
    timestamp: evaluationInput.agent_event?.timestamp ?? evaluationInput.run_ref.started_at ?? clock.now(),
    final_status: mapExecutionResultToFinalStatus(execution_result, policyDecision.decision),
    session_ref: evaluationInput.session_ref,
    run_ref: evaluationInput.run_ref,
    tool_call_ref: evaluationInput.tool_call_ref,
  };
}

function mapToolToEventType(toolName: string): RiskEventType {
  if (toolName === 'exec') {
    return RiskEventType.Exec;
  }

  if (toolName === 'message' || toolName === 'sessions_send') {
    return RiskEventType.Outbound;
  }

  if (toolName === 'write' || toolName === 'apply_patch') {
    return RiskEventType.WorkspaceMutation;
  }

  return RiskEventType.Exec;
}

function mapToolToRiskDomain(eventType: RiskEventType): RiskDomain {
  switch (eventType) {
    case RiskEventType.Outbound:
      return RiskDomain.DataPrivacy;
    case RiskEventType.WorkspaceMutation:
    case RiskEventType.Exec:
    default:
      return RiskDomain.Execution;
  }
}

function mapDecisionToSeverity(decision: ResponseAction): RiskSeverity {
  switch (decision) {
    case ResponseAction.Block:
      return RiskSeverity.High;
    case ResponseAction.ApproveRequired:
    case ResponseAction.Constrain:
      return RiskSeverity.Medium;
    case ResponseAction.Warn:
      return RiskSeverity.Medium;
    case ResponseAction.Allow:
    default:
      return RiskSeverity.Low;
  }
}

function resolveRiskEventStatus(decision: ResponseAction, toolStatus: ToolStatus): RiskEventStatus {
  if (toolStatus === ToolStatus.Blocked || decision === ResponseAction.Block) {
    return RiskEventStatus.Blocked;
  }

  if (toolStatus === ToolStatus.Failed) {
    return RiskEventStatus.Failed;
  }

  if (decision === ResponseAction.ApproveRequired) {
    return RiskEventStatus.PendingApproval;
  }

  if (toolStatus === ToolStatus.Completed) {
    return RiskEventStatus.Allowed;
  }

  return RiskEventStatus.Detected;
}

function mapToolStatusToExecutionResult(
  toolStatus: ToolStatus,
  decision: ResponseAction,
): ExecutionStatus | undefined {
  if (toolStatus === ToolStatus.Blocked || decision === ResponseAction.Block) {
    return ExecutionStatus.Blocked;
  }

  if (toolStatus === ToolStatus.Failed) {
    return ExecutionStatus.Failed;
  }

  if (decision === ResponseAction.Constrain) {
    return ExecutionStatus.Constrained;
  }

  if (toolStatus === ToolStatus.Completed) {
    return ExecutionStatus.Allowed;
  }

  return undefined;
}

function mapExecutionResultToFinalStatus(
  executionResult: ExecutionStatus | undefined,
  decision: ResponseAction,
): AuditRecordFinalStatus {
  switch (executionResult) {
    case ExecutionStatus.Allowed:
      return AuditRecordFinalStatus.Allowed;
    case ExecutionStatus.Blocked:
      return AuditRecordFinalStatus.Blocked;
    case ExecutionStatus.Constrained:
      return AuditRecordFinalStatus.Constrained;
    case ExecutionStatus.Failed:
      return AuditRecordFinalStatus.Failed;
    default:
      return decision === ResponseAction.Block ? AuditRecordFinalStatus.Blocked : AuditRecordFinalStatus.Logged;
  }
}

function buildSummary(evaluationInput: EvaluationInput, policyDecision: PolicyDecision): string {
  const destination = evaluationInput.destination?.target ? ` to ${evaluationInput.destination.target}` : '';
  return `${evaluationInput.tool_name} call${destination} evaluated as ${policyDecision.decision}.`;
}

function buildExplanation(evaluationInput: EvaluationInput, policyDecision: PolicyDecision): string {
  const origin = evaluationInput.origin?.channel ? ` Origin=${evaluationInput.origin.channel}.` : '';
  return `${policyDecision.reason}${origin}`;
}
