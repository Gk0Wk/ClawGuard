import { describe, expect, it } from 'vitest';

import {
  ApprovalActorType,
  ApprovalCategory,
  ApprovalResultStatus,
  AuditRecordFinalStatus,
  ExecutionStatus,
  PolicyDecisionReasonCode,
  ResponseAction,
  RiskEventStatus,
  RiskSeverity,
  RunStatus,
  ToolPhase,
  ToolStatus,
  createApprovalRequest,
  resolveApprovalClosure,
} from '../../src/index.js';

type FinalApprovalResultStatus = Exclude<ApprovalResultStatus, ApprovalResultStatus.Pending>;

function createRequest(status: ApprovalResultStatus = ApprovalResultStatus.Pending) {
  return createApprovalRequest({
    approval_request_id: 'approval-request-1',
    event_id: 'event-1',
    decision_id: 'decision-1',
    approval_category: ApprovalCategory.Exec,
    action_title: 'Run shell command',
    reason_code: PolicyDecisionReasonCode.SessionExecPolicy,
    reason_summary: 'Session exec policy requires approval before execution.',
    risk_level: RiskSeverity.Medium,
    requested_at: '2026-03-12T00:00:00.000Z',
    status,
    session_ref: {
      session_key: 'session-1',
    },
    run_ref: {
      run_id: 'run-1',
      session_key: 'session-1',
      started_at: '2026-03-12T00:00:00.000Z',
      run_status: RunStatus.Running,
    },
    tool_call_ref: {
      tool_call_id: 'tool-1',
      tool_name: 'exec',
      run_id: 'run-1',
      tool_phase: ToolPhase.Before,
      tool_status: ToolStatus.Pending,
    },
  });
}

function createResult(result: FinalApprovalResultStatus) {
  return {
    approval_result_id: `approval-result-${result}`,
    approval_request_id: 'approval-request-1',
    event_id: 'event-1',
    decision_id: 'decision-1',
    result,
    actor_type: ApprovalActorType.User,
    acted_at: '2026-03-12T00:01:00.000Z',
    remembered: false,
  } as const;
}

describe('approval closure', () => {
  it.each([
    {
      label: 'approved (gate cleared, execution pending)',
      result: ApprovalResultStatus.Approved as FinalApprovalResultStatus,
      decisionOutcome: ResponseAction.Allow,
      riskEventStatusAfterClosure: RiskEventStatus.Approved,
      executionResult: undefined,
      auditRecordFinalStatus: AuditRecordFinalStatus.Logged,
    },
    {
      label: 'denied (explicit block)',
      result: ApprovalResultStatus.Denied as FinalApprovalResultStatus,
      decisionOutcome: ResponseAction.Block,
      riskEventStatusAfterClosure: RiskEventStatus.Denied,
      executionResult: ExecutionStatus.Blocked,
      auditRecordFinalStatus: AuditRecordFinalStatus.Blocked,
    },
    {
      label: 'expired (implicit block)',
      result: ApprovalResultStatus.Expired as FinalApprovalResultStatus,
      decisionOutcome: ResponseAction.Block,
      riskEventStatusAfterClosure: RiskEventStatus.Blocked,
      executionResult: ExecutionStatus.Blocked,
      auditRecordFinalStatus: AuditRecordFinalStatus.Blocked,
    },
    {
      label: 'bypassed (gate cleared, execution pending)',
      result: ApprovalResultStatus.Bypassed as FinalApprovalResultStatus,
      decisionOutcome: ResponseAction.Allow,
      riskEventStatusAfterClosure: RiskEventStatus.Approved,
      executionResult: undefined,
      auditRecordFinalStatus: AuditRecordFinalStatus.Logged,
    },
  ])(
    'maps $label approval outcomes into stable post-approval semantics',
    ({ auditRecordFinalStatus, decisionOutcome, executionResult, result, riskEventStatusAfterClosure }) => {
      const closure = resolveApprovalClosure(createRequest(), createResult(result));

      expect(closure.approval_request.status).toBe(result);
      expect(closure.approval_result.result).toBe(result);
      expect(closure.decision_outcome).toBe(decisionOutcome);
      expect(closure.risk_event_status).toBe(riskEventStatusAfterClosure);
      expect(closure.execution_result).toBe(executionResult);
      expect(closure.audit_record_final_status).toBe(auditRecordFinalStatus);
    },
  );

  it.each([
    ApprovalResultStatus.Approved as FinalApprovalResultStatus,
    ApprovalResultStatus.Bypassed as FinalApprovalResultStatus,
  ])('treats %s as approval gate clearance, not execution completion', (result) => {
    const closure = resolveApprovalClosure(createRequest(), createResult(result));

    expect(closure.decision_outcome).toBe(ResponseAction.Allow);
    expect(closure.risk_event_status).toBe(RiskEventStatus.Approved);
    expect(closure.execution_result).toBeUndefined();
    expect(closure.audit_record_final_status).toBe(AuditRecordFinalStatus.Logged);
  });

  it('preserves illegal transition protection when an approval is already closed', () => {
    expect(() =>
      resolveApprovalClosure(createRequest(ApprovalResultStatus.Approved), createResult(ApprovalResultStatus.Denied)),
    ).toThrow('Illegal approval status transition: approved -> denied');
  });
});
