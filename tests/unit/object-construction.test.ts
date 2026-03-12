import { normalizeOpenClawInputs, RunStatus, ToolPhase, ToolStatus } from '../../src/index.js';
import { execFixture } from '../fixtures/index.js';

import { describe, expect, it } from 'vitest';

describe('Sprint 0 object construction', () => {
  it('constructs SessionRef, RunRef, and ToolCallRef for the exec example', () => {
    const normalized = normalizeOpenClawInputs(execFixture.args);

    expect(normalized.session_ref).toEqual({
      agent_id: 'agent-sprint0',
      elevated_level: undefined,
      exec_ask: true,
      exec_host: 'local',
      exec_security: 'restricted',
      origin_channel: 'cli',
      origin_thread: 'sprint-0',
      origin_to: 'local-shell',
      send_policy: undefined,
      session_id: 'session-exec-001',
      session_key: 'clawguard-session-exec',
    });

    expect(normalized.run_ref).toEqual({
      run_id: 'run-exec-001',
      run_status: RunStatus.Running,
      session_key: 'clawguard-session-exec',
      started_at: '2026-03-12T09:00:00.000Z',
    });

    expect(normalized.tool_call_ref).toEqual({
      run_id: 'run-exec-001',
      tool_call_id: 'tool-exec-001',
      tool_name: 'exec',
      tool_phase: ToolPhase.Before,
      tool_status: ToolStatus.Running,
    });
  });
});
