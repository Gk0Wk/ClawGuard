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
      target_mode: 'explicit',
    });
  });

  it('normalizes direct host outbound route context into destination fields', () => {
    const normalized = normalizeOpenClawInputs({
      before_tool_call: {
        event: {
          toolName: 'message_sending',
          params: {
            to: 'https://hooks.slack.com/services/T00000000/B00000000/very-secret-token',
            message: 'daily build finished successfully',
            channelId: 'slack',
            accountId: 'default',
            conversationId: 'C123',
            thread: '1111.2222',
          },
        },
      },
      session_policy: {
        sessionKey: 'session-host-outbound',
      },
    });

    expect(normalized.evaluation_input.destination).toEqual({
      kind: 'channel',
      target: 'https://hooks.slack.com/services/T00000000/B00000000/very-secret-token',
      thread: '1111.2222',
      channel: 'slack',
      account: 'default',
      conversation: 'C123',
      target_mode: 'explicit',
    });
  });

  it('normalizes implicit outbound delivery context from the session policy', () => {
    const normalized = normalizeOpenClawInputs({
      before_tool_call: {
        event: {
          toolName: 'message',
          params: {
            message: 'daily build finished successfully',
          },
        },
      },
      session_policy: {
        sessionKey: 'session-implicit-outbound',
        deliveryContext: {
          channel: 'slack',
          to: 'https://hooks.slack.com/services/T00000000/B00000000/very-secret-token',
          accountId: 'default',
          threadId: '1111.2222',
        },
      },
    });

    expect(normalized.evaluation_input.destination).toEqual({
      kind: 'channel',
      target: 'https://hooks.slack.com/services/T00000000/B00000000/very-secret-token',
      thread: '1111.2222',
      channel: 'slack',
      account: 'default',
      target_mode: 'implicit',
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

  it('normalizes high-confidence path-pair workspace moves as rename-like', () => {
    const normalized = normalizeOpenClawInputs({
      before_tool_call: {
        event: {
          toolName: 'write',
          params: {
            fromPath: 'src\\templates\\approval-policy.ts',
            toPath: 'src\\guards\\approval-policy.ts',
            content: 'export const approvalPolicy = true;',
          },
        },
      },
      session_policy: {
        sessionKey: 'session-write-move',
      },
    });

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['src\\templates\\approval-policy.ts', 'src\\guards\\approval-policy.ts'],
      summary: 'export const approvalPolicy = true;',
      operation_type: 'rename-like',
    });
  });

  it('keeps low-confidence path-pair workspace replacements on modify semantics', () => {
    const normalized = normalizeOpenClawInputs({
      before_tool_call: {
        event: {
          toolName: 'write',
          params: {
            oldPath: 'src\\templates\\approval-policy.ts',
            newPath: 'src\\guards\\runtime-shell.ts',
            content: 'export const approvalPolicy = true;',
          },
        },
      },
      session_policy: {
        sessionKey: 'session-write-replacement',
      },
    });

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['src\\templates\\approval-policy.ts', 'src\\guards\\runtime-shell.ts'],
      summary: 'export const approvalPolicy = true;',
      operation_type: 'modify',
    });
  });

  it('surfaces edit path-reference moves as rename-like when the filename stays the same across directories', () => {
    const normalized = normalizeOpenClawInputs({
      before_tool_call: {
        event: {
          toolName: 'edit',
          params: {
            path: '.env',
            oldText: 'src\\templates\\approval-policy.ts',
            newText: 'src\\guards\\approval-policy.ts',
          },
        },
      },
      session_policy: {
        sessionKey: 'session-edit-path-reference-rename',
      },
    });

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['.env'],
      summary: 'src\\guards\\approval-policy.ts',
      operation_type: 'rename-like',
    });
  });

  it('classifies add/delete apply_patch moves as rename-like when the filename stays the same across directories', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch:
          '*** Begin Patch\n*** Add File: src\\guards\\approval-policy.ts\n+export const approvalPolicy = true;\n*** Delete File: src\\templates\\approval-policy.ts\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['src\\guards\\approval-policy.ts', 'src\\templates\\approval-policy.ts'],
      summary:
        '*** Begin Patch\n*** Add File: src\\guards\\approval-policy.ts\n+export const approvalPolicy = true;\n*** Delete File: src\\templates\\approval-policy.ts\n*** End Patch',
      operation_type: 'rename-like',
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
      label: 'rename-like camelCase identifier rename',
      params: {
        path: 'src\\generated\\feature-flags.ts',
        oldText: 'legacyFeatureFlag',
        newText: 'clawGuardFeatureFlag',
      },
      expectedOperationType: 'rename-like',
    },
    {
      label: 'rename-like snake_case identifier rename',
      params: {
        path: 'src\\generated\\feature-flags.ts',
        oldText: 'legacy_feature_flag',
        newText: 'claw_guard_feature_flag',
      },
      expectedOperationType: 'rename-like',
    },
    {
      label: 'rename-like SCREAMING_SNAKE_CASE identifier rename',
      params: {
        path: 'src\\generated\\feature-flags.ts',
        oldText: 'LEGACY_FEATURE_FLAG',
        newText: 'CLAWGUARD_FEATURE_FLAG',
      },
      expectedOperationType: 'rename-like',
    },
    {
      label: 'modify across naming-family boundary',
      params: {
        path: 'src\\generated\\feature-flags.ts',
        oldText: 'legacyFeatureFlag',
        newText: 'claw_guard_feature_flag',
      },
      expectedOperationType: 'modify',
    },
    {
      label: 'modify for ordinary token value replacement',
      params: {
        path: 'src\\generated\\feature-flags.ts',
        oldText: 'enabled',
        newText: 'disabled',
      },
      expectedOperationType: 'modify',
    },
    {
      label: 'modify for short token replacement',
      params: {
        path: 'src\\generated\\feature-flags.ts',
        oldText: 'x1',
        newText: 'x2',
      },
      expectedOperationType: 'modify',
    },
    {
      label: 'modify for version-like replacement',
      params: {
        path: 'src\\generated\\feature-flags.ts',
        oldText: '1.0.0',
        newText: '2.0.0',
      },
      expectedOperationType: 'modify',
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
      operation_type: 'modify',
    });
  });

  it('classifies update-file hunks with only additions as insert', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch:
          '*** Begin Patch\n*** Update File: .env\n@@\n ENVIRONMENT=production\n+FEATURE_FLAG=true\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['.env'],
      summary:
        '*** Begin Patch\n*** Update File: .env\n@@\n ENVIRONMENT=production\n+FEATURE_FLAG=true\n*** End Patch',
      operation_type: 'insert',
    });
  });

  it('classifies update-file hunks with only deletions as delete', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch:
          '*** Begin Patch\n*** Update File: .env\n@@\n ENVIRONMENT=production\n-FEATURE_FLAG=false\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['.env'],
      summary:
        '*** Begin Patch\n*** Update File: .env\n@@\n ENVIRONMENT=production\n-FEATURE_FLAG=false\n*** End Patch',
      operation_type: 'delete',
    });
  });

  it('classifies update-file patches without explicit hunks as insert when they only add content', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch:
          '*** Begin Patch\n*** Update File: .env\n+FEATURE_FLAG=true\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['.env'],
      summary:
        '*** Begin Patch\n*** Update File: .env\n+FEATURE_FLAG=true\n*** End Patch',
      operation_type: 'insert',
    });
  });

  it('classifies update-file patches without explicit hunks as delete when they only remove content', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch:
          '*** Begin Patch\n*** Update File: .env\n-FEATURE_FLAG=false\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['.env'],
      summary:
        '*** Begin Patch\n*** Update File: .env\n-FEATURE_FLAG=false\n*** End Patch',
      operation_type: 'delete',
    });
  });

  it('keeps update-file patches with context lines on modify when no hunk structure is present', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch:
          '*** Begin Patch\n*** Update File: .env\nENVIRONMENT=production\n+FEATURE_FLAG=true\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['.env'],
      summary:
        '*** Begin Patch\n*** Update File: .env\nENVIRONMENT=production\n+FEATURE_FLAG=true\n*** End Patch',
      operation_type: 'modify',
    });
  });

  it('falls back to modify when update-file hunks conflict across files', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch:
          '*** Begin Patch\n*** Update File: .env\n@@\n ENVIRONMENT=production\n+FEATURE_FLAG=true\n*** Update File: src\\generated\\feature-flags.ts\n@@\n-export const featureFlag = false;\n*** End Patch\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['.env', 'src\\generated\\feature-flags.ts'],
      summary:
        '*** Begin Patch\n*** Update File: .env\n@@\n ENVIRONMENT=production\n+FEATURE_FLAG=true\n*** Update File: src\\generated\\feature-flags.ts\n@@\n-export const featureFlag = false;\n*** End Patch',
      operation_type: 'modify',
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
    expect(normalized.evaluation_input.workspace_context?.operation_type).toBe('delete');
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
    expect(normalized.evaluation_input.workspace_context?.operation_type).toBe('rename-like');
  });

  it('extracts diff header paths from a slash-prefixed patch', () => {
    const normalized = normalizeOpenClawInputs(
      buildApplyPatchArgs({
        patch:
          'diff --git a/src/app.ts b/src/app.ts\n--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1 +1 @@\n-console.log("before");\n+console.log("after");\n',
      }),
    );

    expect(normalized.evaluation_input.workspace_context).toEqual({
      paths: ['src/app.ts'],
      summary:
        'diff --git a/src/app.ts b/src/app.ts\n--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1 +1 @@\n-console.log("before");\n+console.log("after");',
      operation_type: 'modify',
    });
  });

  it.each([
    {
      label: 'add-file header',
      patch: '*** Begin Patch\n*** Add File: src\\generated\\new-file.ts\n+export const created = true;\n*** End Patch\n',
      expectedOperationType: 'add',
    },
    {
      label: 'delete-file header',
      patch: '*** Begin Patch\n*** Delete File: src\\generated\\old-file.ts\n*** End Patch\n',
      expectedOperationType: 'delete',
    },
    {
      label: 'update-file header',
      patch:
        '*** Begin Patch\n*** Update File: src\\generated\\existing-file.ts\n@@\n-export const flag = false;\n+export const flag = true;\n*** End Patch\n',
      expectedOperationType: 'modify',
    },
    {
      label: 'git rename header',
      patch:
        'diff --git a/src\\legacy.ts b/src\\clawguard.ts\nsimilarity index 100%\nrename from src\\legacy.ts\nrename to src\\clawguard.ts\n',
      expectedOperationType: 'rename-like',
    },
    {
      label: 'git copy header',
      patch:
        'diff --git a/src\\legacy.ts b/src\\clawguard.ts\nsimilarity index 100%\ncopy from src\\legacy.ts\ncopy to src\\clawguard.ts\n',
      expectedOperationType: 'rename-like',
    },
    {
      label: 'git new-file diff metadata',
      patch:
        'diff --git a/src\\generated\\new-file.ts b/src\\generated\\new-file.ts\nnew file mode 100644\n--- /dev/null\n+++ b/src\\generated\\new-file.ts\n@@ -0,0 +1 @@\n+export const created = true;\n',
      expectedOperationType: 'add',
    },
  ])('classifies apply_patch workspace mutation semantics for $label', ({ expectedOperationType, patch }) => {
    const normalized = normalizeOpenClawInputs(buildApplyPatchArgs({ patch }));

    expect(normalized.evaluation_input.workspace_context?.operation_type).toBe(expectedOperationType);
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
