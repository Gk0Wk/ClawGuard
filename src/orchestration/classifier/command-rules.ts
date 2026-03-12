import type { EvaluationInput } from '../../domain/context/index.js';
import { ResponseAction, RiskDomain, RiskSeverity } from '../../domain/shared/index.js';

import type { FastPathRuleMatch } from './rule-match.js';

interface CommandRuleDefinition {
  readonly rule_id: string;
  readonly severity: RiskSeverity;
  readonly recommended_action: ResponseAction;
  readonly summary: string;
  readonly reason: string;
  readonly pattern: RegExp;
}

const commandBoundary = String.raw`(?:^|\s*(?:&&|[;|])\s*)`;

const commandRuleDefinitions: readonly CommandRuleDefinition[] = [
  {
    rule_id: 'exec.delete.recursive',
    severity: RiskSeverity.Critical,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a destructive recursive delete command.',
    reason: 'Recursive force-delete commands are hard to reverse and can remove large parts of a workspace or system.',
    pattern: withCommandBoundary(
      String.raw`(?:rm\b(?=[^;&|\n]*-[A-Za-z]*r)(?=[^;&|\n]*-[A-Za-z]*f)[^;&|\n]*|(?:del|erase)\b(?=[^;&|\n]*\/s)(?=[^;&|\n]*\/q)[^;&|\n]*|Remove-Item\b(?=[^;&|\n]*-Recurse\b)(?=[^;&|\n]*-Force\b)[^;&|\n]*|find\b[^;&|\n]*\s-delete\b[^;&|\n]*)`,
    ),
  },
  {
    rule_id: 'exec.download.and.execute',
    severity: RiskSeverity.Critical,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a download-and-execute command chain.',
    reason: 'Downloading remote code and executing it in the same chain is a classic supply-chain and remote execution risk.',
    pattern: withCommandBoundary(
      String.raw`(?:(?:curl|wget)\b[^;&\n]*\|\s*(?:sh|bash|zsh|pwsh|powershell)\b|(?:Invoke-WebRequest|iwr)\b[^;&\n]*\|\s*(?:iex|Invoke-Expression)\b|(?:curl|wget)\b[^;\n]*(?:-o|--output)\s+\S+[^;\n]*(?:&&|;)\s*(?:bash|sh|zsh|pwsh|powershell|\./\S+)\b)`,
      'i',
    ),
  },
  {
    rule_id: 'exec.privilege.escalation',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected an explicit privilege-escalation command.',
    reason: 'Privilege escalation can bypass normal guardrails and increase the blast radius of any mistake.',
    pattern: withCommandBoundary(String.raw`(?:sudo|su|runas)\b`, 'i'),
  },
  {
    rule_id: 'exec.system.configuration',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a high-risk permissions or system-configuration command.',
    reason: 'Permission and system-configuration changes can expose data, break protections, or persist unsafe settings.',
    pattern: withCommandBoundary(
      String.raw`(?:chmod\s+(?:-[A-Za-z]+\s+)?(?:0?777)\b[^;&|\n]*|chown\b[^;&|\n]*|reg\s+add\b[^;&|\n]*|sc\s+config\b[^;&|\n]*|systemctl\s+(?:enable|disable|mask|edit|set-default)\b[^;&|\n]*|sysctl\s+-w\b[^;&|\n]*)`,
      'i',
    ),
  },
];

export function matchCommandRules(command: string): FastPathRuleMatch[] {
  const normalizedCommand = command.trim();
  if (!normalizedCommand) {
    return [];
  }

  return commandRuleDefinitions.flatMap((definition) => {
    const match = definition.pattern.exec(normalizedCommand);
    if (!match) {
      return [];
    }

    const matchedValue = (match[1] ?? match[0]).trim();

    return [
      {
        rule_id: definition.rule_id,
        kind: 'fastpath.command',
        risk_domain: RiskDomain.Execution,
        severity: definition.severity,
        recommended_action: definition.recommended_action,
        summary: definition.summary,
        reason: `${definition.reason} Matched: ${matchedValue}.`,
        match_scope: 'command',
        matched_value: matchedValue,
      },
    ];
  });
}

export function matchCommandRulesForEvaluationInput(
  evaluationInput: Pick<EvaluationInput, 'tool_params' | 'raw_text_candidates'>,
): FastPathRuleMatch[] {
  const commandCandidate =
    typeof evaluationInput.tool_params.command === 'string'
      ? evaluationInput.tool_params.command
      : evaluationInput.raw_text_candidates[0];

  return typeof commandCandidate === 'string' ? matchCommandRules(commandCandidate) : [];
}

function withCommandBoundary(pattern: string, flags = ''): RegExp {
  return new RegExp(`${commandBoundary}(${pattern})`, flags);
}
