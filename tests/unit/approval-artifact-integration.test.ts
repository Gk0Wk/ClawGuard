import { describe, expect, it } from 'vitest';

import {
  ApprovalActorType,
  ApprovalResultStatus,
  AuditRecordFinalStatus,
  ExecutionStatus,
  RiskEventStatus,
  applyApprovalResultToEvaluationArtifacts,
  buildOpenClawEvaluationArtifacts,
} from '../../src/index.js';

function buildApprovalArtifacts() {
  const artifacts = buildOpenClawEvaluationArtifacts({
    before_tool_call: {
      event: {
        toolName: 'exec',
        params: {
          command: 'pnpm test',
        },
        runId: 'run-approval-artifacts-1',
        toolCallId: 'tool-approval-artifacts-1',
      },
    },
    session_policy: {
      sessionKey: 'session-approval-artifacts',
      execAsk: true,
    },
  });

  expect(artifacts.approval_request).toBeDefined();

  return artifacts as typeof artifacts & { readonly approval_request: NonNullable<typeof artifacts.approval_request> };
}

describe('approval artifact integration', () => {
  it('marks the audit trail as pending while approval is still unresolved', () => {
    const artifacts = buildApprovalArtifacts();

    expect(artifacts.risk_event.status).toBe(RiskEventStatus.PendingApproval);
    expect(artifacts.approval_request.status).toBe(ApprovalResultStatus.Pending);
    expect(artifacts.audit_record.approval_result).toBe(ApprovalResultStatus.Pending);
    expect(artifacts.audit_record.approval_result_id).toBeUndefined();
  });

  it.each([
    {
      label: 'approved',
      result: ApprovalResultStatus.Approved,
      expectedRiskStatus: RiskEventStatus.Approved,
      expectedAuditFinalStatus: AuditRecordFinalStatus.Logged,
      expectedExecutionResult: undefined,
    },
    {
      label: 'denied',
      result: ApprovalResultStatus.Denied,
      expectedRiskStatus: RiskEventStatus.Denied,
      expectedAuditFinalStatus: AuditRecordFinalStatus.Blocked,
      expectedExecutionResult: ExecutionStatus.Blocked,
    },
    {
      label: 'expired',
      result: ApprovalResultStatus.Expired,
      expectedRiskStatus: RiskEventStatus.Blocked,
      expectedAuditFinalStatus: AuditRecordFinalStatus.Blocked,
      expectedExecutionResult: ExecutionStatus.Blocked,
    },
    {
      label: 'bypassed',
      result: ApprovalResultStatus.Bypassed,
      expectedRiskStatus: RiskEventStatus.Approved,
      expectedAuditFinalStatus: AuditRecordFinalStatus.Logged,
      expectedExecutionResult: undefined,
    },
  ] satisfies ReadonlyArray<{
    readonly label: string;
    readonly result: Exclude<ApprovalResultStatus, ApprovalResultStatus.Pending>;
    readonly expectedRiskStatus: RiskEventStatus;
    readonly expectedAuditFinalStatus: AuditRecordFinalStatus;
    readonly expectedExecutionResult?: ExecutionStatus;
  }>)('applies $label approval outcomes back onto evaluation artifacts', (testCase) => {
    const artifacts = buildApprovalArtifacts();
    const integrated = applyApprovalResultToEvaluationArtifacts(artifacts, {
      approval_result_id: `approval-result-${testCase.result}`,
      approval_request_id: artifacts.approval_request.approval_request_id,
      event_id: artifacts.approval_request.event_id,
      decision_id: artifacts.approval_request.decision_id,
      result: testCase.result,
      actor_type: ApprovalActorType.User,
      acted_at: '2026-03-12T00:01:00.000Z',
      remembered: false,
    });

    expect(integrated.approval_request.status).toBe(testCase.result);
    expect(integrated.approval_result).toMatchObject({
      approval_request_id: artifacts.approval_request.approval_request_id,
      event_id: artifacts.risk_event.event_id,
      decision_id: artifacts.policy_decision.decision_id,
      audit_record_id: artifacts.audit_record.record_id,
      result: testCase.result,
    });
    expect(integrated.risk_event).toMatchObject({
      event_id: artifacts.risk_event.event_id,
      decision_id: artifacts.policy_decision.decision_id,
      status: testCase.expectedRiskStatus,
    });
    expect(integrated.audit_record).toMatchObject({
      record_id: artifacts.audit_record.record_id,
      event_id: artifacts.risk_event.event_id,
      decision_id: artifacts.policy_decision.decision_id,
      approval_result: testCase.result,
      approval_result_id: `approval-result-${testCase.result}`,
      final_status: testCase.expectedAuditFinalStatus,
    });
    expect(integrated.audit_record.execution_result).toBe(testCase.expectedExecutionResult);
  });

  it('leaves approval_result unset when the decision never entered approval', () => {
    const artifacts = buildOpenClawEvaluationArtifacts({
      before_tool_call: {
        event: {
          toolName: 'message',
          params: {
            to: 'ops-room',
            message: 'all clear',
          },
          runId: 'run-approval-artifacts-no-approval',
          toolCallId: 'tool-approval-artifacts-no-approval',
        },
      },
      session_policy: {
        sessionKey: 'session-approval-artifacts-no-approval',
      },
    });

    expect(artifacts.approval_request).toBeUndefined();
    expect(artifacts.risk_event.status).toBe(RiskEventStatus.Detected);
    expect(artifacts.audit_record.approval_result).toBeUndefined();
    expect(artifacts.audit_record.approval_result_id).toBeUndefined();
  });

  it('rejects approval integration when the artifacts are missing an approval request', () => {
    const artifacts = buildOpenClawEvaluationArtifacts({
      before_tool_call: {
        event: {
          toolName: 'message',
          params: {
            to: 'ops-room',
            message: 'all clear',
          },
          runId: 'run-approval-artifacts-no-request',
          toolCallId: 'tool-approval-artifacts-no-request',
        },
      },
      session_policy: {
        sessionKey: 'session-approval-artifacts-no-request',
      },
    });

    expect(() =>
      applyApprovalResultToEvaluationArtifacts(artifacts, {
        approval_result_id: 'approval-result-orphaned',
        approval_request_id: 'approval-request-orphaned',
        event_id: artifacts.risk_event.event_id,
        decision_id: artifacts.policy_decision.decision_id,
        result: ApprovalResultStatus.Approved,
        actor_type: ApprovalActorType.User,
        acted_at: '2026-03-12T00:01:00.000Z',
        remembered: false,
      }),
    ).toThrow('Cannot apply approval result to artifacts without an approval request.');
  });
});
