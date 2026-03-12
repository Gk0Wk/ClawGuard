import {
  AuditRecordFinalStatus,
  ResponseAction,
  RiskDomain,
  RiskEventStatus,
  RiskEventType,
  RunStatus,
  ToolStatus,
  type BuildEvaluationArtifactsArgs,
} from '../../src/index.js';

export const outboundFixture = {
  args: {
    agent_event: {
      data: {
        result: ' blocked ',
        toolCallId: ' tool-outbound-001 ',
        toolName: ' message ',
      },
      runId: ' run-outbound-001 ',
      seq: 2,
      stream: ' tool ',
      ts: '2026-03-12T09:15:00.000Z',
    },
    before_tool_call: {
      context: {
        runId: ' run-outbound-001 ',
        sessionKey: ' clawguard-session-outbound ',
        toolCallId: ' tool-outbound-001 ',
      },
      event: {
        params: {
          message: '  sk-live-1234567890  ',
          to: ' https://api.example.test/webhooks/public ',
        },
        runId: ' run-outbound-001 ',
        toolCallId: ' tool-outbound-001 ',
        toolName: ' message ',
      },
    },
    session_policy: {
      origin: {
        channel: ' dm ',
        to: ' teammate ',
      },
      sendPolicy: ' deny ',
      sessionKey: ' clawguard-session-outbound ',
    },
  } satisfies BuildEvaluationArtifactsArgs,
  expected: {
    audit_final_status: AuditRecordFinalStatus.Blocked,
    decision: ResponseAction.Block,
    destination_target: 'https://api.example.test/webhooks/public',
    raw_text_candidates: ['sk-live-1234567890', 'https://api.example.test/webhooks/public'],
    risk_domain: RiskDomain.DataPrivacy,
    risk_event_status: RiskEventStatus.Blocked,
    run_status: RunStatus.Failed,
    tool_name: 'message',
    tool_status: ToolStatus.Blocked,
    type: RiskEventType.Outbound,
  },
  name: 'outbound send-policy block example',
} as const;
