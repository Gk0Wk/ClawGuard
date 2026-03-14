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

export const workspaceMutationFixture = {
  args: {
    agent_event: {
      data: {
        result: ' success ',
        toolCallId: ' tool-workspace-001 ',
        toolName: ' write ',
      },
      runId: ' run-workspace-001 ',
      seq: 3,
      stream: ' tool ',
      ts: '2026-03-12T09:30:00.000Z',
    },
    before_tool_call: {
      context: {
        runId: ' run-workspace-001 ',
        sessionKey: ' clawguard-session-workspace ',
        toolCallId: ' tool-workspace-001 ',
      },
        event: {
          params: {
            content: '  export const featureFlag = true;  ',
            path: '  src\\generated\\config.ts  ',
            paths: ['  src\\generated\\config.ts  ', ' src\\generated\\feature-flags.ts ', '   '],
          },
          runId: ' run-workspace-001 ',
          toolCallId: ' tool-workspace-001 ',
          toolName: ' write ',
      },
    },
    session_policy: {
      origin: {
        channel: ' cli ',
        to: ' workspace ',
      },
      sessionKey: ' clawguard-session-workspace ',
    },
  } satisfies BuildEvaluationArtifactsArgs,
  expected: {
    audit_final_status: AuditRecordFinalStatus.Allowed,
    changed_paths: ['src\\generated\\config.ts', 'src\\generated\\feature-flags.ts'],
    decision: ResponseAction.Allow,
    raw_text_candidates: ['export const featureFlag = true;', 'src\\generated\\config.ts'],
    risk_domain: RiskDomain.Execution,
    risk_event_status: RiskEventStatus.Allowed,
    run_status: RunStatus.Completed,
    tool_name: 'write',
    tool_status: ToolStatus.Completed,
    type: RiskEventType.WorkspaceMutation,
  },
  name: 'workspace mutation allow example',
} as const;

export const workspaceEditMutationFixture = {
  args: {
    agent_event: {
      data: {
        phase: ' started ',
        toolCallId: ' tool-workspace-edit-001 ',
        toolName: ' edit ',
      },
      runId: ' run-workspace-edit-001 ',
      seq: 4,
      stream: ' tool ',
      ts: '2026-03-12T09:45:00.000Z',
    },
    before_tool_call: {
      context: {
        runId: ' run-workspace-edit-001 ',
        sessionKey: ' clawguard-session-workspace-edit ',
        toolCallId: ' tool-workspace-edit-001 ',
      },
      event: {
        params: {
          path: '  .env  ',
          oldText: '  API_KEY=old-value  ',
          newText: '  API_KEY=prod_live_secret_value_123456789  ',
        },
        runId: ' run-workspace-edit-001 ',
        toolCallId: ' tool-workspace-edit-001 ',
        toolName: ' edit ',
      },
    },
    session_policy: {
      origin: {
        channel: ' cli ',
        to: ' workspace ',
      },
      sessionKey: ' clawguard-session-workspace-edit ',
    },
  } satisfies BuildEvaluationArtifactsArgs,
  expected: {
    audit_final_status: AuditRecordFinalStatus.Logged,
    changed_paths: ['.env'],
    decision: ResponseAction.ApproveRequired,
    raw_text_candidates: ['API_KEY=prod_live_secret_value_123456789', '.env', 'API_KEY=old-value'],
    risk_domain: RiskDomain.Execution,
    risk_event_status: RiskEventStatus.PendingApproval,
    run_status: RunStatus.Running,
    tool_name: 'edit',
    tool_status: ToolStatus.Running,
    type: RiskEventType.WorkspaceMutation,
    operation_type: 'modify',
  },
  name: 'workspace edit approval example',
} as const;
