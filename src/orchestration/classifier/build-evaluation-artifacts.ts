import type { EvaluationInput } from '../../domain/context/index.js';
import type { ApprovalRequest } from '../../domain/approval/index.js';
import type { AuditRecord } from '../../domain/audit/index.js';
import { derivePolicyDecisionSemantics, type PolicyDecision } from '../../domain/policy/index.js';
import type { RiskEvent } from '../../domain/risk/index.js';
import {
  ApprovalCategory,
  ApprovalResultStatus,
  PolicyDecisionReasonCode,
  ResponseAction,
  RiskTriggerSource,
} from '../../domain/shared/index.js';
import { createStableId, systemClock, type RuntimeClock } from '../../shared/index.js';
import type { NormalizeOpenClawInputsArgs } from '../../adapters/openclaw/normalization.js';
import { normalizeOpenClawInputs } from '../../adapters/openclaw/normalization.js';
import { createApprovalRequest } from '../../domain/approval/index.js';
import type { FastPathRuleMatch } from './rule-match.js';
import { PipelineKind, classifyToolRouting, type ToolRoutingMetadata } from './routing.js';
import {
  buildRuleMatchesForRouting,
  mapDecisionToSeverity,
  mapExecutionResultToFinalStatus,
  mapToolStatusToExecutionResult,
  resolveRiskEventStatus,
  selectPrimaryRuleMatch,
} from './evaluation-outcomes.js';
import {
  buildApprovalActionTitle,
  buildApprovalImpactScope,
  buildExplanation,
  buildSummary,
} from './evaluation-presentation.js';

export interface EvaluationArtifacts {
  readonly evaluation_input: EvaluationInput;
  readonly session_ref: EvaluationInput['session_ref'];
  readonly run_ref: EvaluationInput['run_ref'];
  readonly tool_call_ref: EvaluationInput['tool_call_ref'];
  readonly routing: ToolRoutingMetadata;
  readonly rule_matches: readonly FastPathRuleMatch[];
  readonly risk_event: RiskEvent;
  readonly policy_decision: PolicyDecision;
  readonly approval_request?: ApprovalRequest;
  readonly audit_record: AuditRecord;
}

export interface BuildEvaluationArtifactsArgs extends NormalizeOpenClawInputsArgs {}

export function buildOpenClawEvaluationArtifacts(args: BuildEvaluationArtifactsArgs): EvaluationArtifacts {
  const clock = args.clock ?? systemClock;
  const normalized = normalizeOpenClawInputs(args);
  const routing = classifyToolRouting(normalized.evaluation_input.tool_name);
  const rule_matches = buildRuleMatchesForRouting(normalized.evaluation_input, routing);
  const policy_decision = buildPolicyDecision(normalized.evaluation_input, routing, rule_matches);
  const risk_event = buildRiskEvent(normalized.evaluation_input, routing, policy_decision, rule_matches);
  const approval_request = buildApprovalRequest(normalized.evaluation_input, routing, risk_event, policy_decision, clock);
  const audit_record = buildAuditRecord(normalized.evaluation_input, risk_event, policy_decision, clock);

  return {
    evaluation_input: normalized.evaluation_input,
    session_ref: normalized.session_ref,
    run_ref: normalized.run_ref,
    tool_call_ref: normalized.tool_call_ref,
    routing,
    rule_matches,
    risk_event,
    policy_decision,
    approval_request,
    audit_record,
  };
}

function buildPolicyDecision(
  evaluationInput: EvaluationInput,
  routing: ToolRoutingMetadata,
  ruleMatches: readonly FastPathRuleMatch[],
): PolicyDecision {
  if (routing.pipeline_kind === PipelineKind.Outbound && evaluationInput.session_ref.send_policy === 'deny') {
    return {
      decision_id: createStableId('decision', evaluationInput.run_ref.run_id, evaluationInput.tool_call_ref.tool_call_id),
      decision: ResponseAction.Block,
      reason_code: PolicyDecisionReasonCode.SessionSendPolicy,
      reason: 'Session send policy denies outbound delivery.',
      ...derivePolicyDecisionSemantics(ResponseAction.Block),
    };
  }

  const primaryMatch = selectPrimaryRuleMatch(ruleMatches);
  if (primaryMatch) {
    return {
      decision_id: createStableId('decision', evaluationInput.run_ref.run_id, evaluationInput.tool_call_ref.tool_call_id),
      decision: primaryMatch.recommended_action,
      reason_code: mapRuleMatchToReasonCode(primaryMatch),
      reason: primaryMatch.reason,
      ...derivePolicyDecisionSemantics(primaryMatch.recommended_action),
    };
  }

  if (routing.pipeline_kind === PipelineKind.Exec && evaluationInput.session_ref.exec_ask) {
    return {
      decision_id: createStableId('decision', evaluationInput.run_ref.run_id, evaluationInput.tool_call_ref.tool_call_id),
      decision: ResponseAction.ApproveRequired,
      reason_code: PolicyDecisionReasonCode.SessionExecPolicy,
      reason: 'Session exec policy requires approval before execution.',
      ...derivePolicyDecisionSemantics(ResponseAction.ApproveRequired),
    };
  }

  return {
    decision_id: createStableId('decision', evaluationInput.run_ref.run_id, evaluationInput.tool_call_ref.tool_call_id),
    decision: ResponseAction.Allow,
    reason_code: PolicyDecisionReasonCode.DefaultAllow,
    reason: 'No blocking or approval-only session policy matched this tool call.',
    ...derivePolicyDecisionSemantics(ResponseAction.Allow),
  };
}

function buildRiskEvent(
  evaluationInput: EvaluationInput,
  routing: ToolRoutingMetadata,
  policyDecision: PolicyDecision,
  ruleMatches: readonly FastPathRuleMatch[],
): RiskEvent {
  const primaryMatch = selectPrimaryRuleMatch(ruleMatches);

  return {
    event_id: createStableId('event', evaluationInput.run_ref.run_id, evaluationInput.tool_call_ref.tool_call_id),
    decision_id: policyDecision.decision_id,
    event_type: routing.event_type,
    risk_domain: routing.risk_domain,
    trigger_source: RiskTriggerSource.BeforeToolCall,
    summary: buildSummary(evaluationInput, policyDecision, primaryMatch),
    explanation: buildExplanation(evaluationInput, policyDecision, primaryMatch, ruleMatches),
    severity: primaryMatch?.severity ?? mapDecisionToSeverity(policyDecision.decision),
    recommended_action: policyDecision.decision,
    status: resolveRiskEventStatus(policyDecision.decision, evaluationInput.tool_call_ref.tool_status),
    session_ref: evaluationInput.session_ref,
    run_ref: evaluationInput.run_ref,
    tool_call_ref: evaluationInput.tool_call_ref,
  };
}

function buildApprovalRequest(
  evaluationInput: EvaluationInput,
  routing: ToolRoutingMetadata,
  riskEvent: RiskEvent,
  policyDecision: PolicyDecision,
  clock: RuntimeClock,
): ApprovalRequest | undefined {
  if (!policyDecision.requires_approval) {
    return undefined;
  }

  const requestedAt = evaluationInput.agent_event?.timestamp ?? evaluationInput.run_ref.started_at ?? clock.now();

  return createApprovalRequest({
    approval_request_id: createStableId('approval', riskEvent.event_id, policyDecision.decision_id),
    event_id: riskEvent.event_id,
    decision_id: policyDecision.decision_id,
    approval_category: mapPipelineKindToApprovalCategory(routing),
    action_title: buildApprovalActionTitle(evaluationInput),
    reason_code: policyDecision.reason_code,
    reason_summary: policyDecision.reason,
    risk_level: riskEvent.severity,
    impact_scope: buildApprovalImpactScope(evaluationInput),
    requested_at: requestedAt,
    session_ref: evaluationInput.session_ref,
    run_ref: evaluationInput.run_ref,
    tool_call_ref: evaluationInput.tool_call_ref,
  });
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
    approval_result: policyDecision.requires_approval ? ApprovalResultStatus.Pending : undefined,
    execution_result,
    timestamp: evaluationInput.agent_event?.timestamp ?? evaluationInput.run_ref.started_at ?? clock.now(),
    final_status: mapExecutionResultToFinalStatus(execution_result, policyDecision.decision),
    session_ref: evaluationInput.session_ref,
    run_ref: evaluationInput.run_ref,
    tool_call_ref: evaluationInput.tool_call_ref,
  };
}

function mapRuleMatchToReasonCode(ruleMatch: FastPathRuleMatch): PolicyDecisionReasonCode {
  switch (ruleMatch.kind) {
    case 'fastpath.command':
      return PolicyDecisionReasonCode.FastPathCommand;
    case 'fastpath.path':
      return PolicyDecisionReasonCode.FastPathPath;
    case 'fastpath.secret':
      return PolicyDecisionReasonCode.FastPathSecret;
    case 'fastpath.destination':
      return PolicyDecisionReasonCode.FastPathDestination;
    default:
      return PolicyDecisionReasonCode.DefaultAllow;
  }
}

function mapPipelineKindToApprovalCategory(routing: ToolRoutingMetadata): ApprovalCategory {
  switch (routing.pipeline_kind) {
    case PipelineKind.Exec:
      return ApprovalCategory.Exec;
    case PipelineKind.Outbound:
      return ApprovalCategory.Outbound;
    case PipelineKind.WorkspaceMutation:
      return ApprovalCategory.WorkspaceMutation;
    default:
      return ApprovalCategory.Generic;
  }
}
