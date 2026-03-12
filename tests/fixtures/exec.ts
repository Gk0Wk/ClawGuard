import {
  ResponseAction,
  RiskDomain,
  RiskEventStatus,
  RiskEventType,
  RunStatus,
  ToolStatus,
  type BuildEvaluationArtifactsArgs,
} from '../../src/index.js';

export const execFixture = {
  args: {
    agent_event: {
      data: {
        phase: ' started ',
        toolCallId: ' tool-exec-001 ',
        toolName: ' exec ',
      },
      runId: ' run-exec-001 ',
      seq: 1,
      stream: ' tool ',
      ts: '2026-03-12T09:00:00.000Z',
    },
    before_tool_call: {
      context: {
        agentId: ' agent-sprint0 ',
        runId: ' run-exec-001 ',
        sessionId: ' session-exec-001 ',
        sessionKey: ' clawguard-session-exec ',
        toolCallId: ' tool-exec-001 ',
      },
      event: {
        params: {
          command: '  Remove-Item -Recurse -Force .\\logs  ',
        },
        runId: ' run-exec-001 ',
        toolCallId: ' tool-exec-001 ',
        toolName: ' exec ',
      },
    },
    session_policy: {
      agentId: ' agent-sprint0 ',
      execAsk: true,
      execHost: ' local ',
      execSecurity: ' restricted ',
      origin: {
        channel: ' cli ',
        thread: ' sprint-0 ',
        to: ' local-shell ',
      },
      sessionId: ' session-exec-001 ',
      sessionKey: ' clawguard-session-exec ',
    },
  } satisfies BuildEvaluationArtifactsArgs,
  expected: {
    audit_final_status: 'logged',
    decision: ResponseAction.ApproveRequired,
    raw_text_candidates: ['Remove-Item -Recurse -Force .\\logs'],
    risk_domain: RiskDomain.Execution,
    risk_event_status: RiskEventStatus.PendingApproval,
    run_status: RunStatus.Running,
    tool_name: 'exec',
    tool_status: ToolStatus.Running,
    type: RiskEventType.Exec,
  },
  name: 'exec approval example',
} as const;
