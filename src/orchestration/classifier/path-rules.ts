import type { EvaluationInput } from '../../domain/context/index.js';
import { ResponseAction, RiskDomain, RiskSeverity } from '../../domain/shared/index.js';

import type { FastPathRuleMatch } from './rule-match.js';

interface PathRuleDefinition {
  readonly rule_id: string;
  readonly severity: RiskSeverity;
  readonly recommended_action: ResponseAction;
  readonly summary: string;
  readonly reason: string;
  readonly matches: (candidate: NormalizedPathCandidate) => boolean;
}

interface NormalizedPathCandidate {
  readonly original_path: string;
  readonly normalized_path: string;
  readonly segments: readonly string[];
  readonly basename: string;
}

const secretMaterialFilenames = new Set([
  '.npmrc',
  '.netrc',
  '.pypirc',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  'authorized_keys',
  'known_hosts',
  'credentials',
]);

const secretMaterialDirectories = new Set([
  '.aws',
  '.gnupg',
  '.kube',
  '.ssh',
  '.secrets',
  '.credentials',
  'credentials',
  'private-keys',
  'secrets',
]);

const repoMetadataDirectories = new Set(['.git']);

const pathRuleDefinitions: readonly PathRuleDefinition[] = [
  {
    rule_id: 'path.system.sensitive',
    severity: RiskSeverity.Critical,
    recommended_action: ResponseAction.Block,
    summary: 'Detected a write targeting a critical system path.',
    reason: 'Critical system configuration paths can change host behavior, persistence, or core trust settings.',
    matches: (candidate) => isSystemSensitivePath(candidate.normalized_path),
  },
  {
    rule_id: 'path.secret.material',
    severity: RiskSeverity.Critical,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a write targeting credential or key material.',
    reason: 'Credential stores, key material, and auth configuration files often contain live secrets or control trusted access.',
    matches: (candidate) =>
      secretMaterialFilenames.has(candidate.basename) ||
      candidate.segments.some((segment) => secretMaterialDirectories.has(segment)),
  },
  {
    rule_id: 'path.repo.metadata',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a write targeting repository metadata.',
    reason: 'Repository metadata can change hooks, refs, or configuration and may silently affect future code execution or history.',
    matches: (candidate) => candidate.segments.some((segment) => repoMetadataDirectories.has(segment)),
  },
  {
    rule_id: 'path.critical.config',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a write targeting a critical environment configuration file.',
    reason: 'Environment configuration files often carry live secrets and deployment behavior that should be reviewed before modification.',
    matches: (candidate) => candidate.basename === '.env' || candidate.basename.startsWith('.env.'),
  },
];

export function matchPathRules(paths: readonly string[]): FastPathRuleMatch[] {
  const matches: FastPathRuleMatch[] = [];
  const seenPaths = new Set<string>();

  for (const rawPath of paths) {
    const candidate = normalizePathCandidate(rawPath);
    if (!candidate) {
      continue;
    }

    if (seenPaths.has(candidate.normalized_path)) {
      continue;
    }

    seenPaths.add(candidate.normalized_path);

    for (const definition of pathRuleDefinitions) {
      if (!definition.matches(candidate)) {
        continue;
      }

      matches.push({
        rule_id: definition.rule_id,
        kind: 'fastpath.path',
        risk_domain: RiskDomain.Execution,
        severity: definition.severity,
        recommended_action: definition.recommended_action,
        summary: definition.summary,
        reason: `${definition.reason} Matched path: ${candidate.original_path}.`,
        match_scope: 'path',
        matched_value: candidate.original_path,
      });
      break;
    }
  }

  return matches;
}

export function matchPathRulesForEvaluationInput(
  evaluationInput: Pick<EvaluationInput, 'workspace_context'>,
): FastPathRuleMatch[] {
  return matchPathRules(evaluationInput.workspace_context?.paths ?? []);
}

function normalizePathCandidate(rawPath: string): NormalizedPathCandidate | undefined {
  const trimmedPath = rawPath.trim();
  if (!trimmedPath) {
    return undefined;
  }

  const normalizedPath = trimmedPath.replace(/[\\/]+/g, '/').replace(/\/+$/g, '') || '/';
  const lowerCasedPath = normalizedPath.toLowerCase();
  const segments = lowerCasedPath.split('/').filter((segment) => segment.length > 0);
  const basename = segments.at(-1) ?? lowerCasedPath;

  return {
    original_path: trimmedPath,
    normalized_path: lowerCasedPath,
    segments,
    basename,
  };
}

function isSystemSensitivePath(normalizedPath: string): boolean {
  return [
    /^\/(?:private\/)?etc(?:\/|$)/,
    /^\/usr\/local\/etc(?:\/|$)/,
    /^\/boot(?:\/|$)/,
    /^\/library\/launch(?:agents|daemons)(?:\/|$)/,
    /^[a-z]:\/windows\/system32(?:\/|$)/,
    /^[a-z]:\/programdata(?:\/|$)/,
  ].some((pattern) => pattern.test(normalizedPath));
}
