import process from 'node:process';

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

const keyWorkspaceConfigFilenames = new Set([
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
  'tsconfig.json',
]);

const pathRuleDefinitions: readonly PathRuleDefinition[] = [
  {
    rule_id: 'path.system.sensitive',
    severity: RiskSeverity.Critical,
    recommended_action: ResponseAction.Block,
    summary: 'Detected a workspace mutation targeting a critical system path.',
    reason: 'Critical system configuration paths can change host behavior, persistence, or core trust settings.',
    matches: (candidate) => isSystemSensitivePath(candidate.normalized_path),
  },
  {
    rule_id: 'path.secret.material',
    severity: RiskSeverity.Critical,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a workspace mutation targeting credential or key material.',
    reason: 'Credential stores, key material, and auth configuration files often contain live secrets or control trusted access.',
    matches: (candidate) =>
      secretMaterialFilenames.has(candidate.basename) ||
      candidate.segments.some((segment) => secretMaterialDirectories.has(segment)),
  },
  {
    rule_id: 'path.repo.hooks',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a workspace mutation targeting repository hook automation.',
    reason: 'Repository hook scripts can silently change local execution behavior before commits, pushes, or other developer actions.',
    matches: (candidate) => includesSegmentPair(candidate.segments, '.git', 'hooks'),
  },
  {
    rule_id: 'path.repo.workflow',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a workspace mutation targeting repository workflow automation.',
    reason: 'Workflow definitions can change CI behavior, automation boundaries, and how repository secrets are used.',
    matches: (candidate) => includesSegmentPair(candidate.segments, '.github', 'workflows'),
  },
  {
    rule_id: 'path.repo.metadata',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a workspace mutation targeting repository metadata.',
    reason: 'Repository metadata can change hooks, refs, or configuration and may silently affect future code execution or history.',
    matches: (candidate) => candidate.segments.some((segment) => repoMetadataDirectories.has(segment)),
  },
  {
    rule_id: 'path.critical.config',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a workspace mutation targeting a critical environment configuration file.',
    reason: 'Environment configuration files often carry live secrets and deployment behavior that should be reviewed before modification.',
    matches: (candidate) => candidate.basename === '.env' || candidate.basename.startsWith('.env.'),
  },
  {
    rule_id: 'path.workspace.escape',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a workspace mutation targeting a path outside the current workspace.',
    reason: 'Writes that escape the working tree or jump to broad absolute paths can change files that are outside the expected demo workspace.',
    matches: (candidate) => isOutsideCurrentWorkspace(candidate),
  },
  {
    rule_id: 'path.workspace.config',
    severity: RiskSeverity.High,
    recommended_action: ResponseAction.ApproveRequired,
    summary: 'Detected a workspace mutation targeting a key workspace config file.',
    reason: 'Workspace config and lock files can redirect builds, dependency resolution, or test behavior and should be reviewed before modification.',
    matches: (candidate) => isKeyWorkspaceConfig(candidate.basename),
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

function includesSegmentPair(
  segments: readonly string[],
  first: string,
  second: string,
): boolean {
  return segments.some((segment, index) => segment === first && segments[index + 1] === second);
}

function isKeyWorkspaceConfig(basename: string): boolean {
  return (
    keyWorkspaceConfigFilenames.has(basename) ||
    /^tsconfig\.[^.]+(?:\.[^.]+)?\.json$/u.test(basename) ||
    /^(?:vite|vitest|eslint)\.config\.[cm]?[jt]s$/u.test(basename)
  );
}

function isOutsideCurrentWorkspace(candidate: NormalizedPathCandidate): boolean {
  const workspaceRoot = normalizeComparablePath(process.cwd());
  if (!workspaceRoot) {
    return false;
  }

  if (isAbsoluteComparablePath(candidate.normalized_path)) {
    return !isWithinWorkspaceRoot(candidate.normalized_path, workspaceRoot);
  }

  if (!candidate.segments.some((segment) => segment === '..')) {
    return false;
  }

  const workspaceSegments = workspaceRoot.split('/').filter((segment) => segment.length > 0);
  const resolvedSegments = [...workspaceSegments];

  for (const segment of candidate.segments) {
    if (segment === '.') {
      continue;
    }

    if (segment === '..') {
      if (resolvedSegments.length === workspaceSegments.length) {
        return true;
      }

      resolvedSegments.pop();
      continue;
    }

    resolvedSegments.push(segment);
  }

  return false;
}

function normalizeComparablePath(rawPath: string): string {
  return rawPath.trim().replace(/[\\/]+/g, '/').replace(/\/+$/g, '').toLowerCase();
}

function isAbsoluteComparablePath(normalizedPath: string): boolean {
  return normalizedPath.startsWith('/') || /^[a-z]:\//u.test(normalizedPath);
}

function isWithinWorkspaceRoot(candidatePath: string, workspaceRoot: string): boolean {
  return candidatePath === workspaceRoot || candidatePath.startsWith(`${workspaceRoot}/`);
}
