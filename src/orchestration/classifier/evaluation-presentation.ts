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
  const destinationPresentation = buildDestinationPresentation(evaluationInput);
  const routeMode = buildRouteModePresentation(evaluationInput);

  if (primaryMatch) {
    return `${primaryMatch.summary}${workspaceOperation ? ` Operation type: ${workspaceOperation}.` : ''}${routeMode ? ` Route mode=${routeMode}.` : ''} ${evaluationInput.tool_name} call evaluated as ${policyDecision.decision}.`;
  }

  const destination = destinationPresentation ? ` to ${destinationPresentation}` : '';
  const operation = workspaceOperation ? ` with ${workspaceOperation} semantics` : '';
  const route = routeMode ? ` (${routeMode} route)` : '';
  return `${evaluationInput.tool_name} call${destination}${route}${operation} evaluated as ${policyDecision.decision}.`;
}

export function buildExplanation(
  evaluationInput: EvaluationInput,
  policyDecision: PolicyDecision,
  primaryMatch: FastPathRuleMatch | undefined,
  ruleMatches: readonly FastPathRuleMatch[] = [],
): string {
  const origin = evaluationInput.origin?.channel ? ` Origin=${evaluationInput.origin.channel}.` : '';
  const destination = buildDestinationExplanation(evaluationInput);
  const workspaceOperation = buildWorkspaceOperationPresentation(evaluationInput);
  const workspaceOperationExplanation = workspaceOperation
    ? ` Workspace operation type=${workspaceOperation}.`
    : '';
  const routeMode = buildRouteModePresentation(evaluationInput);
  const routeModeExplanation = routeMode ? ` Route mode=${routeMode}.` : '';

  if (primaryMatch) {
    const additionalRuleIds = ruleMatches
      .filter((match) => match.rule_id !== primaryMatch.rule_id)
      .map((match) => match.rule_id);
    const additionalMatches =
      additionalRuleIds.length > 0 ? ` Additional fast-path matches: ${additionalRuleIds.join(', ')}.` : '';

    return `${policyDecision.reason} Scope=${primaryMatch.match_scope}.${additionalMatches}${destination}${routeModeExplanation}${workspaceOperationExplanation}${origin}`;
  }

  return `${policyDecision.reason}${destination}${routeModeExplanation}${workspaceOperationExplanation}${origin}`;
}

export function buildApprovalActionTitle(evaluationInput: EvaluationInput): string {
  const routeMode = buildRouteModePresentation(evaluationInput);
  switch (evaluationInput.tool_name) {
    case 'exec':
      return 'Approve command execution';
    case 'message':
    case 'message_sending':
    case 'sessions_send':
      return routeMode
        ? `Approve outbound delivery (${routeMode} route)`
        : 'Approve outbound delivery';
    case 'write':
    case 'edit':
    case 'apply_patch':
      return `Approve workspace mutation${buildWorkspaceOperationPresentation(evaluationInput, true) ?? ''}`;
    default:
      return `Approve ${evaluationInput.tool_name} action`;
  }
}

export function buildApprovalImpactScope(evaluationInput: EvaluationInput): string | undefined {
  const destinationPresentation = buildDestinationPresentation(evaluationInput);
  if (destinationPresentation) {
    return destinationPresentation;
  }

  if (evaluationInput.workspace_context?.paths.length) {
    return evaluationInput.workspace_context.paths.join(', ');
  }

  const command = evaluationInput.tool_params.command;
  return typeof command === 'string' ? command.trim() : undefined;
}

function buildDestinationPresentation(evaluationInput: EvaluationInput): string | undefined {
  const destination = evaluationInput.destination;
  if (!destination) {
    return undefined;
  }

  const routeParts = [destination.channel, destination.account, destination.conversation].filter(
    (value): value is string => Boolean(value),
  );
  const threadPresentation = destination.thread ? ` (thread ${destination.thread})` : '';

  if (destination.target && routeParts.length > 0) {
    return `${destination.target} via ${routeParts.join('/')}${threadPresentation}`;
  }

  if (destination.target) {
    return `${destination.target}${threadPresentation}`;
  }

  if (routeParts.length > 0) {
    return `${routeParts.join('/')}${threadPresentation}`;
  }

  if (destination.thread) {
    return `thread ${destination.thread}`;
  }

  return undefined;
}

function buildDestinationExplanation(evaluationInput: EvaluationInput): string {
  const destinationPresentation = buildDestinationPresentation(evaluationInput);
  const routeMode = buildRouteModePresentation(evaluationInput);
  if (!destinationPresentation && !routeMode) {
    return '';
  }

  return [
    destinationPresentation ? ` Outbound route=${destinationPresentation}.` : '',
    routeMode ? ` Route mode=${routeMode}.` : '',
  ].join('');
}

function buildRouteModePresentation(evaluationInput: EvaluationInput): 'explicit' | 'implicit' | undefined {
  const routeMode = evaluationInput.destination?.target_mode;
  return routeMode === 'explicit' || routeMode === 'implicit' ? routeMode : undefined;
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
    case WorkspaceMutationOperationType.Add:
      return 'add';
    case WorkspaceMutationOperationType.Insert:
      return 'insert';
    case WorkspaceMutationOperationType.Delete:
      return 'delete';
    case WorkspaceMutationOperationType.Modify:
    default:
      return 'modify';
  }
}
