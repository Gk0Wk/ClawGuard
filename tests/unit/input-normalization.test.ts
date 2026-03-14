import path from 'node:path';

import { normalizeOpenClawInputs } from '../../src/index.js';
import { execFixture, outboundFixture, workspaceEditMutationFixture, workspaceMutationFixture } from '../fixtures/index.js';

import { describe, expect, it } from 'vitest';

function buildApplyPatchArgs(params: Record<string, unknown>) {
  return {
    before_tool_call: {
      event: {
        toolName: 'apply_patch',
        params,
      },
    },
    session_policy: {
      sessionKey: 'session-patch',
      origin: {
        channel: 'terminal',
        to: 'workspace',
      },
    },
  };
}

describe('Sprint 0 input normalization', () => {
  it('normalizes the exec example into shared text candidates', () => {
    const normalized = normalizeOpenClawInputs(execFixture.args);

    expect(normalized.evaluation_input.tool_name).toBe(execFixture.expected.tool_name);
    expect(normalized.evaluation_input.raw_text_candidates).toEqual(execFixture.expected.raw_text_candidates);
  });

  it('normalizes the outbound example destination fields', () => {
    const normalized = normalizeOpenClawInputs(outboundFixture.args);

    expect(normalized.evaluation_input.tool_name).toBe(outboundFixture.expected.tool_name);
    expect(normalized.evaluation_input.raw_text_candidates).toEqual(outboundFixture.expected.raw_text_candidates);
    expect(normalized.evaluation_input.destination).toEqual({
      kind: 'channel',
      target: outboundFixture.expected.destination_target,
      thread: undefined,
    });
  });

  it('normalizes workspace mutation paths and summaries', () => {
    const normalized = normalizeOpenClawInputs(workspaceMutationFixture.args);

    expect(normalized.evaluation_input.tool_name).toBe(workspaceMutationFixture.expected.tool_name);
    expect(normalized.evaluation_input.raw_text_candidates).toEqual(workspaceMutationFixture.expected.raw_text_candidates);
    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: workspaceMutationFixture.expected.changed_paths,
      summary: 'export const featureFlag = true;',
      operation_type: undefined,
    });
  });

  it('normalizes edit mutations into workspace context and text candidates', () => {
    const normalized = normalizeOpenClawInputs(workspaceEditMutationFixture.args);

    expect(normalized.evaluation_input.tool_name).toBe(workspaceEditMutationFixture.expected.tool_name);
    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: workspaceEditMutationFixture.expected.changed_paths,
      summary: 'API_KEY=prod_live_secret_value_123456789',
      operation_type: workspaceEditMutationFixture.expected.operation_type,
    });
    expect(normalized.evaluation_input.raw_text_candidates).toEqual(workspaceEditMutationFixture.expected.raw_text_candidates);
  });

  it.each([
    {
      label: 'insert',
      params: {
        path: 'src\\generated\\feature-flags.ts',
        oldText: '   ',
        newText: 'featureFlag = true',
      },
      expectedOperationType: 'insert',
    },
    {
      label: 'delete',
      params: {
        path: 'src\\generated\\feature-flags.ts',
        oldText: 'featureFlag = true',
        newText: '   ',
      },
      expectedOperationType: 'delete',
    },
    {
      label: 'rename-like',
      params: {
        path: 'src\\generated\\feature-flags.ts',
        oldText: 'legacyFeatureFlag',
        newText: 'clawGuardFeatureFlag',
      },
      expectedOperationType: 'rename-like',
    },
  ])('classifies edit workspace mutation semantics for $label updates', ({ expectedOperationType, params }) => {
    const normalized = normalizeOpenClawInputs({
      before_tool_call: {
        event: {
          toolName: 'edit',
          params,
        },
      },
      session_policy: {
        sessionKey: 'session-edit-semantics',
      },
    });

    expect(normalized.evaluation_input.workspace_context?.operation_type).toBe(expectedOperationType);
  });

  it('extracts a single file path from apply_patch text', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch: '*** Begin Patch\n*** Update File: src\\risk\\engine.ts\n@@\n-export const oldValue = 1;\n+export const oldValue = 2;\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['src\\risk\\engine.ts'],
      summary:
        '*** Begin Patch\n*** Update File: src\\risk\\engine.ts\n@@\n-export const oldValue = 1;\n+export const oldValue = 2;\n*** End Patch',
      operation_type: undefined,
    });
  });

  it('extracts multiple file paths from multi-file apply_patch text', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch:
          '*** Begin Patch\n*** Add File: src\\generated\\new-file.ts\n+export const created = true;\n*** Update File: src\\generated\\existing-file.ts\n@@\n-export const flag = false;\n+export const flag = true;\n*** Delete File: src\\generated\\old-file.ts\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context?.paths).toEqual([
      'src\\generated\\new-file.ts',
      'src\\generated\\existing-file.ts',
      'src\\generated\\old-file.ts',
    ]);
  });

  it('extracts patchPath and move targets into the workspace mutation path set', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patchPath: 'src\\templates\\ci-template.yml',
        patch:
          '*** Begin Patch\n*** Update File: src\\templates\\ci-template.yml\n*** Move to: .github\\workflows\\ci.yml\n@@\n-name: old\n+name: new\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context?.paths).toEqual([
      'src\\templates\\ci-template.yml',
      '.github\\workflows\\ci.yml',
    ]);
  });

  it('extracts diff header paths from a slash-prefixed patch', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch:
          'diff --git a/src/app.ts b/src/app.ts\n--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1 +1 @@\n-console.log("before");\n+console.log("after");\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context?.paths).toEqual(['src/app.ts']);
  });

  it('merges structured paths with patch-extracted paths without duplicates', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        path: 'src\\existing.ts',
        filePath: 'src\\existing.ts',
        paths: ['src\\shared.ts', 'src\\existing.ts', '  '],
        patch:
          '*** Begin Patch\n*** Update File: src\\existing.ts\n@@\n-export const version = 1;\n+export const version = 2;\n*** Add File: src\\added.ts\n+export const added = true;\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context?.paths).toEqual([
      'src\\existing.ts',
      'src\\shared.ts',
      'src\\added.ts',
    ]);
  });

  it('degrades safely when patch text has no path headers', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch: '*** Begin Patch\n@@\n+no headers here\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: [],
      summary: '*** Begin Patch\n@@\n+no headers here\n*** End Patch',
      operation_type: undefined,
    });
  });

  it('keeps in-workspace parent traversal normalized without dropping the effective target path', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        path: path.join('src', '..', 'package.json'),
      }),
    );

    expect(normalized.evaluation_input.workspace_context?.paths).toEqual([path.join('src', '..', 'package.json')]);
  });

  it.each([
    '.env',
    '.git\\hooks\\pre-commit',
    '.github\\workflows\\ci.yml',
    '.ssh\\config',
    'src\\features\\billing\\invoice-service.ts',
  ])('extracts patch-only workspace paths for %s', (expectedPath) => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch: `*** Begin Patch\n*** Update File: ${expectedPath}\n@@\n-placeholder\n+updated\n*** End Patch\n`,
      }),
    );

    expect(normalized.evaluation_input.workspace_context?.paths).toEqual([expectedPath]);
  });
});
