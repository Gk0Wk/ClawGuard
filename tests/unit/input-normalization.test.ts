import { normalizeOpenClawInputs } from '../../src/index.js';
import { execFixture, outboundFixture, workspaceMutationFixture } from '../fixtures/index.js';

import { describe, expect, it } from 'vitest';

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
      summary: 'API_KEY=demo-key',
    });
  });
});
