import { describe, expect, it } from 'vitest';

import {
  AuditRecordFinalStatus,
  ResponseAction,
  RiskDomain,
  RiskEventStatus,
  RiskEventType,
  ToolStatus,
  buildOpenClawEvaluationArtifacts,
} from '../../src/index.js';

const fixedClock = {
  now: () => '2026-03-12T00:00:00.000Z',
};

describe('OpenClaw adapter pipeline', () => {
  it('normalizes an exec tool call into refs, evaluation input, and approval-oriented records', () => {
    const result = buildOpenClawEvaluationArtifacts({
      clock: fixedClock,
      before_tool_call: {
        event: {
          toolName: 'exec',
          params: {
            command: 'pnpm test',
          },
          runId: 'run-exec-1',
          toolCallId: 'tool-exec-1',
        },
        context: {
          sessionKey: 'session-alpha',
          sessionId: 'session-uuid-1',
          agentId: 'agent-1',
        },
      },
      session_policy: {
        sessionKey: 'session-alpha',
        sessionId: 'session-uuid-1',
        agentId: 'agent-1',
        execAsk: true,
        execHost: 'local',
        execSecurity: 'restricted',
        elevatedLevel: 'user',
        origin: {
          channel: 'terminal',
          to: 'local-user',
          thread: 'main',
        },
      },
      agent_event: {
        runId: 'run-exec-1',
        seq: 1,
        stream: 'tool',
        ts: '2026-03-12T00:00:01.000Z',
        data: {
          toolName: 'exec',
          toolCallId: 'tool-exec-1',
          phase: 'started',
          status: 'running',
          summary: 'tool execution started',
        },
      },
    });

    expect(result.session_ref.session_key).toBe('session-alpha');
    expect(result.run_ref.run_id).toBe('run-exec-1');
    expect(result.tool_call_ref.tool_call_id).toBe('tool-exec-1');
    expect(result.tool_call_ref.tool_status).toBe(ToolStatus.Running);
    expect(result.evaluation_input.raw_text_candidates).toContain('pnpm test');
    expect(result.policy_decision.decision).toBe(ResponseAction.ApproveRequired);
    expect(result.policy_decision.requires_approval).toBe(true);
    expect(result.risk_event.event_type).toBe(RiskEventType.Exec);
    expect(result.risk_event.risk_domain).toBe(RiskDomain.Execution);
    expect(result.risk_event.status).toBe(RiskEventStatus.PendingApproval);
    expect(result.audit_record.final_status).toBe(AuditRecordFinalStatus.Logged);
  });

  it('blocks outbound delivery when session send policy denies it', () => {
    const result = buildOpenClawEvaluationArtifacts({
      clock: fixedClock,
      before_tool_call: {
        event: {
          toolName: 'sessions_send',
          params: {
            to: 'public-room',
            message: 'sk-live-demo-key',
          },
          runId: 'run-send-1',
          toolCallId: 'tool-send-1',
        },
      },
      session_policy: {
        sessionKey: 'session-send',
        sendPolicy: 'deny',
        origin: {
          channel: 'slack',
          to: 'engineering',
          thread: 42,
        },
      },
      agent_event: {
        runId: 'run-send-1',
        seq: 2,
        stream: 'tool',
        ts: 1773273600000,
        data: {
          toolName: 'sessions_send',
          toolCallId: 'tool-send-1',
          status: 'blocked',
          summary: 'delivery blocked by policy',
        },
      },
    });

    expect(result.evaluation_input.destination).toEqual({
      kind: 'session',
      target: 'public-room',
      thread: undefined,
    });
    expect(result.policy_decision.decision).toBe(ResponseAction.Block);
    expect(result.risk_event.event_type).toBe(RiskEventType.Outbound);
    expect(result.risk_event.risk_domain).toBe(RiskDomain.DataPrivacy);
    expect(result.risk_event.status).toBe(RiskEventStatus.Blocked);
    expect(result.audit_record.execution_result).toBe('blocked');
    expect(result.audit_record.final_status).toBe(AuditRecordFinalStatus.Blocked);
  });
});
