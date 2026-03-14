import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ResponseAction, matchPathRules, matchPathRulesForEvaluationInput } from '../../src/index.js';

describe('path rules', () => {
  it.each([
    {
      paths: ['.env'],
      rule_id: 'path.critical.config',
      matched_value: '.env',
      recommended_action: ResponseAction.ApproveRequired,
    },
    {
      paths: ['C:\\Users\\alice\\.ssh\\id_rsa'],
      rule_id: 'path.secret.material',
      matched_value: 'C:\\Users\\alice\\.ssh\\id_rsa',
      recommended_action: ResponseAction.ApproveRequired,
    },
    {
      paths: ['.git\\hooks\\pre-commit'],
      rule_id: 'path.repo.hooks',
      matched_value: '.git\\hooks\\pre-commit',
      recommended_action: ResponseAction.ApproveRequired,
    },
    {
      paths: ['.github\\workflows\\ci.yml'],
      rule_id: 'path.repo.workflow',
      matched_value: '.github\\workflows\\ci.yml',
      recommended_action: ResponseAction.ApproveRequired,
    },
    {
      paths: ['package.json'],
      rule_id: 'path.workspace.config',
      matched_value: 'package.json',
      recommended_action: ResponseAction.ApproveRequired,
    },
    {
      paths: ['..\\outside\\staged.ts'],
      rule_id: 'path.workspace.escape',
      matched_value: '..\\outside\\staged.ts',
      recommended_action: ResponseAction.ApproveRequired,
    },
    {
      paths: ['C:\\Windows\\System32\\drivers\\etc\\hosts'],
      rule_id: 'path.system.sensitive',
      matched_value: 'C:\\Windows\\System32\\drivers\\etc\\hosts',
      recommended_action: ResponseAction.Block,
    },
  ])('returns explainable matches for $rule_id', ({ matched_value, paths, recommended_action, rule_id }) => {
    const matches = matchPathRules(paths);

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          matched_value,
          match_scope: 'path',
          reason: expect.stringContaining(`Matched path: ${matched_value}`),
          recommended_action,
          rule_id,
          summary: expect.any(String),
        }),
      ]),
    );
  });

  it('reads workspace mutation paths from evaluation input', () => {
    const matches = matchPathRulesForEvaluationInput({
      workspace_context: {
        paths: ['src\\billing\\invoice-service.ts', '.env.local', '.github\\workflows\\ci.yml', 'C:\\Users\\alice\\.ssh\\config'],
      },
    });

    expect(matches.map((match) => match.rule_id)).toEqual(
      expect.arrayContaining(['path.critical.config', 'path.secret.material', 'path.repo.workflow']),
    );
    expect(matches.map((match) => match.matched_value)).toEqual(
      expect.arrayContaining(['.env.local', '.github\\workflows\\ci.yml', 'C:\\Users\\alice\\.ssh\\config']),
    );
  });

  it('does not flag absolute paths that stay inside the current workspace root as workspace escapes', () => {
    const safeWorkspacePath = path.join(process.cwd(), 'src', 'features', 'billing', 'invoice-service.ts');

    expect(matchPathRules([safeWorkspacePath])).toEqual([]);
  });

  it.each([
    ['src\\features\\billing\\invoice-service.ts'],
    ['docs\\runbooks\\incident-response.md'],
    ['apps\\dashboard\\src\\components\\ApprovalCard.tsx'],
    ['tests\\fixtures\\workspace-mutation.ts'],
  ])('avoids ordinary business file path %s', (path) => {
    expect(matchPathRules([path])).toEqual([]);
  });
});
