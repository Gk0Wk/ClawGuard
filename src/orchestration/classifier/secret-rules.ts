import type { EvaluationInput } from '../../domain/context/index.js';
import { ResponseAction, RiskDomain, RiskSeverity } from '../../domain/shared/index.js';

import type { FastPathRuleMatch } from './rule-match.js';

interface SecretRuleDefinition {
  readonly rule_id: string;
  readonly severity: RiskSeverity;
  readonly recommended_action: ResponseAction;
  readonly summary: string;
  readonly reason: string;
  readonly match_scope: string;
  readonly patterns: readonly RegExp[];
  readonly extract_match?: (match: RegExpExecArray) => string;
}

const secretRuleDefinitions: readonly SecretRuleDefinition[] = [
  {
    rule_id: 'secret.api-key.pattern',
    severity: RiskSeverity.Critical,
    recommended_action: ResponseAction.Block,
    summary: 'Detected a high-confidence API key prefix.',
    reason: 'Known API key prefixes can grant direct access to paid services or private data.',
    match_scope: 'raw_text',
    patterns: [
      /\bsk-(?:live|proj)-[A-Za-z0-9]{12,}\b/,
      /\bAKIA[0-9A-Z]{16}\b/,
      /\bAIza[0-9A-Za-z\-_]{35}\b/,
    ],
  },
  {
    rule_id: 'secret.token.pattern',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a high-confidence access token prefix.',
    reason: 'Access tokens can let the recipient act as the current user or integration.',
    match_scope: 'raw_text',
    patterns: [
      /\bghp_[A-Za-z0-9]{36}\b/,
      /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
      /\bglpat-[A-Za-z0-9\-_]{20,}\b/,
      /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
      /\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}\b/i,
    ],
  },
  {
    rule_id: 'secret.private-key.pattern',
    severity: RiskSeverity.Critical,
    recommended_action: ResponseAction.Block,
    summary: 'Detected a private key fragment.',
    reason: 'Private key material can allow irreversible account, host, or repository compromise.',
    match_scope: 'raw_text',
    patterns: [
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
      /-----BEGIN ENCRYPTED PRIVATE KEY-----/,
    ],
  },
  {
    rule_id: 'secret.config-field.pattern',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a sensitive configuration field with a non-placeholder value.',
    reason: 'Sensitive config fields often carry live credentials and should not be sent or logged casually.',
    match_scope: 'config_field',
    patterns: [
      /(?:^|[\s{,(])([A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PRIVATE_KEY))\s*[:=]\s*("([^"\r\n]+)"|'([^'\r\n]+)'|([^\s,;]+))/i,
    ],
    extract_match: (match) => `${match[1]}=${stripWrappingQuotes(match[2])}`,
  },
];

export function matchSecretRules(textCandidates: readonly string[]): FastPathRuleMatch[] {
  const matches: FastPathRuleMatch[] = [];
  const seen = new Set<string>();

  for (const textCandidate of textCandidates) {
    const normalizedCandidate = textCandidate.trim();
    if (!normalizedCandidate) {
      continue;
    }

    for (const definition of secretRuleDefinitions) {
      for (const pattern of definition.patterns) {
        const match = pattern.exec(normalizedCandidate);
        if (!match) {
          continue;
        }

        const matchedValue = (definition.extract_match?.(match) ?? match[0]).trim();
        if (!matchedValue) {
          continue;
        }

        if (definition.rule_id === 'secret.config-field.pattern' && isLikelyPlaceholderValue(extractConfigValue(matchedValue))) {
          continue;
        }

        const dedupeKey = `${definition.rule_id}:${matchedValue.toLowerCase()}`;
        if (seen.has(dedupeKey)) {
          continue;
        }

        seen.add(dedupeKey);
        matches.push({
          rule_id: definition.rule_id,
          kind: 'fastpath.secret',
          risk_domain: RiskDomain.DataPrivacy,
          severity: definition.severity,
          recommended_action: definition.recommended_action,
          summary: definition.summary,
          reason: `${definition.reason} Matched: ${matchedValue}.`,
          match_scope: definition.match_scope,
          matched_value: matchedValue,
        });

        break;
      }
    }
  }

  return matches;
}

export function matchSecretRulesForEvaluationInput(
  evaluationInput: Pick<EvaluationInput, 'raw_text_candidates'>,
): FastPathRuleMatch[] {
  return matchSecretRules(evaluationInput.raw_text_candidates);
}

function extractConfigValue(matchedValue: string): string {
  const separatorIndex = matchedValue.indexOf('=');
  if (separatorIndex === -1) {
    return '';
  }

  return matchedValue.slice(separatorIndex + 1).trim();
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function isLikelyPlaceholderValue(value: string): boolean {
  const normalized = stripWrappingQuotes(value).trim().toLowerCase();
  if (normalized.length < 12) {
    return true;
  }

  return (
    normalized.includes('example') ||
    normalized.includes('sample') ||
    normalized.includes('demo') ||
    normalized.includes('dummy') ||
    normalized.includes('placeholder') ||
    normalized.includes('changeme') ||
    normalized.includes('your_') ||
    normalized.includes('<')
  );
}
