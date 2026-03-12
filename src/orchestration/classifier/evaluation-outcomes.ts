import type { EvaluationInput } from '../../domain/context/index.js';
import {
  AuditRecordFinalStatus,
  ExecutionStatus,
  ResponseAction,
  RiskEventStatus,
  RiskSeverity,
  ToolStatus,
} from '../../domain/shared/index.js';

import { matchCommandRulesForEvaluationInput } from './command-rules.js';
import { matchDestinationRulesForEvaluationInput } from './destination-rules.js';
import { matchPathRulesForEvaluationInput } from './path-rules.js';
import { PipelineKind, type ToolRoutingMetadata } from './routing.js';
import type { FastPathRuleMatch } from './rule-match.js';
import { matchSecretRulesForEvaluationInput } from './secret-rules.js';

export function buildRuleMatchesForRouting(
  evaluationInput: EvaluationInput,
  routing: ToolRoutingMetadata,
): readonly FastPathRuleMatch[] {
  switch (routing.pipeline_kind) {
    case PipelineKind.Exec:
      return matchCommandRulesForEvaluationInput(evaluationInput);
    case PipelineKind.Outbound:
      return [
        ...matchDestinationRulesForEvaluationInput(evaluationInput),
        ...matchSecretRulesForEvaluationInput(evaluationInput),
      ];
    case PipelineKind.WorkspaceMutation:
      return [
        ...matchPathRulesForEvaluationInput(evaluationInput),
        ...matchSecretRulesForEvaluationInput(evaluationInput),
      ];
    case PipelineKind.Neutral:
    default:
      return [];
  }
}

export function mapDecisionToSeverity(decision: ResponseAction): RiskSeverity {
  switch (decision) {
    case ResponseAction.Block:
      return RiskSeverity.High;
    case ResponseAction.ApproveRequired:
    case ResponseAction.Constrain:
    case ResponseAction.Warn:
      return RiskSeverity.Medium;
    case ResponseAction.Allow:
    default:
      return RiskSeverity.Low;
  }
}

export function resolveRiskEventStatus(decision: ResponseAction, toolStatus: ToolStatus): RiskEventStatus {
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

export function mapToolStatusToExecutionResult(
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

export function mapExecutionResultToFinalStatus(
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

export function selectPrimaryRuleMatch(
  ruleMatches: readonly FastPathRuleMatch[],
): FastPathRuleMatch | undefined {
  return [...ruleMatches].sort(compareRuleMatchPriority)[0];
}

function compareRuleMatchPriority(left: FastPathRuleMatch, right: FastPathRuleMatch): number {
  const severityDelta = severityRank(right.severity) - severityRank(left.severity);
  if (severityDelta !== 0) {
    return severityDelta;
  }

  return actionRank(right.recommended_action) - actionRank(left.recommended_action);
}

function severityRank(severity: RiskSeverity): number {
  switch (severity) {
    case RiskSeverity.Critical:
      return 4;
    case RiskSeverity.High:
      return 3;
    case RiskSeverity.Medium:
      return 2;
    case RiskSeverity.Low:
    default:
      return 1;
  }
}

function actionRank(action: ResponseAction): number {
  switch (action) {
    case ResponseAction.Block:
      return 5;
    case ResponseAction.ApproveRequired:
      return 4;
    case ResponseAction.Constrain:
      return 3;
    case ResponseAction.Warn:
      return 2;
    case ResponseAction.Allow:
    default:
      return 1;
  }
}
