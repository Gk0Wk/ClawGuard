import type { EvaluationInput } from '../../domain/context/index.js';
import type { PolicyDecision } from '../../domain/policy/index.js';

import type { FastPathRuleMatch } from './rule-match.js';

export function buildSummary(
  evaluationInput: EvaluationInput,
  policyDecision: PolicyDecision,
  primaryMatch: FastPathRuleMatch | undefined,
): string {
  if (primaryMatch) {
    return `${primaryMatch.summary} ${evaluationInput.tool_name} call evaluated as ${policyDecision.decision}.`;
  }

  const destination = evaluationInput.destination?.target ? ` to ${evaluationInput.destination.target}` : '';
  return `${evaluationInput.tool_name} call${destination} evaluated as ${policyDecision.decision}.`;
}

export function buildExplanation(
  evaluationInput: EvaluationInput,
  policyDecision: PolicyDecision,
  primaryMatch: FastPathRuleMatch | undefined,
  ruleMatches: readonly FastPathRuleMatch[] = [],
): string {
  const origin = evaluationInput.origin?.channel ? ` Origin=${evaluationInput.origin.channel}.` : '';

  if (primaryMatch) {
    const additionalRuleIds = ruleMatches
      .filter((match) => match.rule_id !== primaryMatch.rule_id)
      .map((match) => match.rule_id);
    const additionalMatches =
      additionalRuleIds.length > 0 ? ` Additional fast-path matches: ${additionalRuleIds.join(', ')}.` : '';

    return `${policyDecision.reason} Scope=${primaryMatch.match_scope}.${additionalMatches}${origin}`;
  }

  return `${policyDecision.reason}${origin}`;
}

export function buildApprovalActionTitle(evaluationInput: EvaluationInput): string {
  switch (evaluationInput.tool_name) {
    case 'exec':
      return 'Approve command execution';
    case 'message':
    case 'sessions_send':
      return 'Approve outbound delivery';
    case 'write':
    case 'apply_patch':
      return 'Approve workspace mutation';
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
