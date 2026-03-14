import type { EvaluationInput } from '../../domain/context/index.js';
import type { PolicyDecision } from '../../domain/policy/index.js';
import { WorkspaceMutationOperationType } from '../../domain/shared/index.js';

import type { FastPathRuleMatch } from './rule-match.js';

export function buildSummary(
  evaluationInput: EvaluationInput,
  policyDecision: PolicyDecision,
  primaryMatch: FastPathRuleMatch | undefined,
): string {
  const workspaceOperation = buildWorkspaceOperationPresentation(evaluationInput);

  if (primaryMatch) {
    return `${primaryMatch.summary}${workspaceOperation ? ` Operation type: ${workspaceOperation}.` : ''} ${evaluationInput.tool_name} call evaluated as ${policyDecision.decision}.`;
  }

  const destination = evaluationInput.destination?.target ? ` to ${evaluationInput.destination.target}` : '';
  const operation = workspaceOperation ? ` with ${workspaceOperation} semantics` : '';
  return `${evaluationInput.tool_name} call${destination}${operation} evaluated as ${policyDecision.decision}.`;
}

export function buildExplanation(
  evaluationInput: EvaluationInput,
  policyDecision: PolicyDecision,
  primaryMatch: FastPathRuleMatch | undefined,
  ruleMatches: readonly FastPathRuleMatch[] = [],
): string {
  const origin = evaluationInput.origin?.channel ? ` Origin=${evaluationInput.origin.channel}.` : '';
  const workspaceOperation = buildWorkspaceOperationPresentation(evaluationInput);
  const workspaceOperationExplanation = workspaceOperation
    ? ` Workspace operation type=${workspaceOperation}.`
    : '';

  if (primaryMatch) {
    const additionalRuleIds = ruleMatches
      .filter((match) => match.rule_id !== primaryMatch.rule_id)
      .map((match) => match.rule_id);
    const additionalMatches =
      additionalRuleIds.length > 0 ? ` Additional fast-path matches: ${additionalRuleIds.join(', ')}.` : '';

    return `${policyDecision.reason} Scope=${primaryMatch.match_scope}.${additionalMatches}${workspaceOperationExplanation}${origin}`;
  }

  return `${policyDecision.reason}${workspaceOperationExplanation}${origin}`;
}

export function buildApprovalActionTitle(evaluationInput: EvaluationInput): string {
  switch (evaluationInput.tool_name) {
    case 'exec':
      return 'Approve command execution';
    case 'message':
    case 'message_sending':
    case 'sessions_send':
      return 'Approve outbound delivery';
    case 'write':
    case 'edit':
    case 'apply_patch':
      return `Approve workspace mutation${buildWorkspaceOperationPresentation(evaluationInput, true) ?? ''}`;
    default:
      return `Approve ${evaluationInput.tool_name} action`;
  }
}

export function buildApprovalImpactScope(evaluationInput: EvaluationInput): string | undefined {
  if (evaluationInput.destination?.target) {
    return evaluationInput.destination.target;
  }

  if (evaluationInput.workspace_context?.paths.length) {
    return evaluationInput.workspace_context.paths.join(', ');
  }

  const command = evaluationInput.tool_params.command;
  return typeof command === 'string' ? command.trim() : undefined;
}

function buildWorkspaceOperationPresentation(
  evaluationInput: EvaluationInput,
  includeWrapping = false,
): string | undefined {
  const operationType = evaluationInput.workspace_context?.operation_type;
  if (!operationType) {
    return undefined;
  }

  const label = formatWorkspaceOperationType(operationType);
  return includeWrapping ? ` (${label})` : label;
}

function formatWorkspaceOperationType(operationType: WorkspaceMutationOperationType): string {
  switch (operationType) {
    case WorkspaceMutationOperationType.RenameLike:
      return 'rename-like';
    case WorkspaceMutationOperationType.Insert:
      return 'insert';
    case WorkspaceMutationOperationType.Delete:
      return 'delete';
    case WorkspaceMutationOperationType.Modify:
    default:
      return 'modify';
  }
}
