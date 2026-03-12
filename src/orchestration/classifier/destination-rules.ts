import { isIP } from 'node:net';

import type { EvaluationInput } from '../../domain/context/index.js';
import { ResponseAction, RiskDomain, RiskSeverity } from '../../domain/shared/index.js';

import type { FastPathRuleMatch } from './rule-match.js';

interface DestinationAnalysis {
  readonly normalized_target: string;
  readonly hostname?: string;
  readonly is_absolute_http_url: boolean;
  readonly is_direct_ip_target: boolean;
  readonly is_private_or_local: boolean;
  readonly is_webhook_like: boolean;
}

export function matchDestinationRules(destinationTarget: string | undefined): FastPathRuleMatch[] {
  const analysis = analyzeDestinationTarget(destinationTarget);
  if (!analysis || analysis.is_private_or_local) {
    return [];
  }

  if (analysis.is_direct_ip_target) {
    return [
      buildDestinationMatch({
        rule_id: 'destination.direct-ip-target',
        severity: RiskSeverity.High,
        recommended_action: ResponseAction.ApproveRequired,
        summary: 'Detected a direct public IP destination.',
        reason:
          'Direct public IP targets bypass the normal trust signals of named internal services and deserve explicit review before outbound delivery.',
        match_scope: 'destination.direct_ip_target',
        matched_value: analysis.hostname ?? analysis.normalized_target,
      }),
    ];
  }

  if (analysis.is_absolute_http_url && analysis.is_webhook_like) {
    return [
      buildDestinationMatch({
        rule_id: 'destination.public-webhook-url',
        severity: RiskSeverity.High,
        recommended_action: ResponseAction.ApproveRequired,
        summary: 'Detected a public webhook destination.',
        reason:
          'Webhook-style internet endpoints can forward content straight outside the current session, so outbound delivery should be reviewed first.',
        match_scope: 'destination.public_webhook_url',
        matched_value: analysis.normalized_target,
      }),
    ];
  }

  if (analysis.is_absolute_http_url) {
    return [
      buildDestinationMatch({
        rule_id: 'destination.public-generic-url',
        severity: RiskSeverity.Medium,
        recommended_action: ResponseAction.Warn,
        summary: 'Detected a public internet URL destination.',
        reason:
          'A generic public URL sits outside local and private collaboration boundaries. Review the outbound content when it is sensitive, but the destination alone is not treated as an obviously malicious endpoint.',
        match_scope: 'destination.public_generic_url',
        matched_value: analysis.normalized_target,
      }),
    ];
  }

  return [];
}

export function matchDestinationRulesForEvaluationInput(
  evaluationInput: Pick<EvaluationInput, 'destination'>,
): FastPathRuleMatch[] {
  return matchDestinationRules(evaluationInput.destination?.target);
}

function buildDestinationMatch(match: Omit<FastPathRuleMatch, 'kind' | 'risk_domain' | 'reason'> & { reason: string }): FastPathRuleMatch {
  return {
    ...match,
    kind: 'fastpath.destination',
    risk_domain: RiskDomain.DataPrivacy,
    reason: `${match.reason} Matched destination feature: ${match.match_scope}. Matched: ${match.matched_value}.`,
  };
}

function analyzeDestinationTarget(destinationTarget: string | undefined): DestinationAnalysis | undefined {
  const normalizedTarget = destinationTarget?.trim();
  if (!normalizedTarget) {
    return undefined;
  }

  const parsedUrl = parseAbsoluteHttpUrl(normalizedTarget);
  const hostname = parsedUrl ? parsedUrl.hostname : extractBareHostCandidate(normalizedTarget);
  const normalizedHost = normalizeHostname(hostname);

  if (!normalizedHost) {
    return {
      normalized_target: normalizedTarget,
      hostname: undefined,
      is_absolute_http_url: Boolean(parsedUrl),
      is_direct_ip_target: false,
      is_private_or_local: false,
      is_webhook_like: false,
    };
  }

  return {
    normalized_target: normalizedTarget,
    hostname: normalizedHost,
    is_absolute_http_url: Boolean(parsedUrl),
    is_direct_ip_target: isIpHost(normalizedHost),
    is_private_or_local: isPrivateOrLocalHost(normalizedHost),
    is_webhook_like: isWebhookLike(parsedUrl?.hostname, parsedUrl?.pathname),
  };
}

function parseAbsoluteHttpUrl(target: string): URL | undefined {
  try {
    const parsedUrl = new URL(target);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return parsedUrl;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function extractBareHostCandidate(target: string): string | undefined {
  if (target.includes('/') || /\s/.test(target)) {
    return undefined;
  }

  if (target.startsWith('[')) {
    const closingBracketIndex = target.indexOf(']');
    if (closingBracketIndex > 0) {
      return target.slice(1, closingBracketIndex);
    }
  }

  if (target.includes('::')) {
    return target;
  }

  const hostPortMatch = /^([^:]+):\d+$/.exec(target);
  if (hostPortMatch) {
    return hostPortMatch[1];
  }

  return target;
}

function normalizeHostname(hostname: string | undefined): string | undefined {
  if (!hostname) {
    return undefined;
  }

  const normalized = hostname.trim().replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function isIpHost(hostname: string): boolean {
  return isIP(hostname) !== 0;
}

function isPrivateOrLocalHost(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.corp') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.home.arpa')
  ) {
    return true;
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    const octets = hostname.split('.').map((segment) => Number(segment));
    return (
      octets[0] === 0 ||
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );
  }

  if (ipVersion === 6) {
    return hostname === '::1' || /^fe[89ab]/i.test(hostname) || /^f[cd]/i.test(hostname);
  }

  return false;
}

function isWebhookLike(hostname: string | undefined, pathname: string | undefined): boolean {
  const normalizedHost = hostname?.toLowerCase();
  const normalizedPath = pathname?.toLowerCase() ?? '';

  return (
    Boolean(normalizedHost && normalizedHost.includes('webhook')) ||
    Boolean(normalizedHost && normalizedHost.startsWith('hooks.')) ||
    Boolean(normalizedHost && normalizedHost.includes('.hooks.')) ||
    normalizedPath.includes('/webhook') ||
    normalizedPath.includes('/webhooks') ||
    normalizedPath.includes('/hook')
  );
}
