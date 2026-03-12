import { describe, expect, it } from 'vitest';

import {
  ApprovalCategory,
  APPROVAL_TERMINAL_STATUSES,
  ApprovalActorType,
  ApprovalResultStatus,
  PolicyDecisionReasonCode,
  RiskSeverity,
  RunStatus,
  ToolPhase,
  ToolStatus,
  applyApprovalResult,
  assertApprovalStatusTransition,
  canTransitionApprovalStatus,
  createApprovalRequest,
} from '../../src/index.js';

describe('approval domain', () => {
  it('covers the complete Sprint 1 approval status model', () => {
    expect(Object.values(ApprovalResultStatus)).toEqual([
      'pending',
      'approved',
      'denied',
      'expired',
      'bypassed',
    ]);
    expect(APPROVAL_TERMINAL_STATUSES).toEqual([
      ApprovalResultStatus.Approved,
      ApprovalResultStatus.Denied,
      ApprovalResultStatus.Expired,
      ApprovalResultStatus.Bypassed,
    ]);
  });

  it('allows only pending -> approved|denied|expired|bypassed transitions', () => {
    const request = createApprovalRequest({
      approval_request_id: 'approval-request-1',
      event_id: 'event-1',
      decision_id: 'decision-1',
      approval_category: ApprovalCategory.Exec,
      action_title: 'Run shell command',
      reason_code: PolicyDecisionReasonCode.SessionExecPolicy,
      reason_summary: 'Session exec policy requires approval before execution.',
      risk_level: RiskSeverity.Medium,
      requested_at: '2026-03-12T00:00:00.000Z',
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

    const approvedRequest = applyApprovalResult(request, {
      approval_result_id: 'approval-result-1',
      approval_request_id: request.approval_request_id,
      event_id: request.event_id,
      decision_id: request.decision_id,
      result: ApprovalResultStatus.Approved,
      actor_type: ApprovalActorType.User,
      acted_at: '2026-03-12T00:01:00.000Z',
      remembered: true,
    });

    expect(approvedRequest.status).toBe(ApprovalResultStatus.Approved);
    expect(request.approval_category).toBe(ApprovalCategory.Exec);
    expect(request.reason_code).toBe(PolicyDecisionReasonCode.SessionExecPolicy);
    expect(canTransitionApprovalStatus(ApprovalResultStatus.Pending, ApprovalResultStatus.Denied)).toBe(true);
    expect(canTransitionApprovalStatus(ApprovalResultStatus.Pending, ApprovalResultStatus.Expired)).toBe(true);
    expect(canTransitionApprovalStatus(ApprovalResultStatus.Pending, ApprovalResultStatus.Bypassed)).toBe(true);
    expect(canTransitionApprovalStatus(ApprovalResultStatus.Approved, ApprovalResultStatus.Denied)).toBe(false);
    expect(() =>
      assertApprovalStatusTransition(ApprovalResultStatus.Approved, ApprovalResultStatus.Expired),
    ).toThrow('Illegal approval status transition: approved -> expired');
  });

  it('rejects approval results that do not link back to the original request, event, and decision', () => {
    const request = createApprovalRequest({
      approval_request_id: 'approval-request-1',
      event_id: 'event-1',
      decision_id: 'decision-1',
      approval_category: ApprovalCategory.Exec,
      action_title: 'Run shell command',
      reason_code: PolicyDecisionReasonCode.SessionExecPolicy,
      reason_summary: 'Session exec policy requires approval before execution.',
      risk_level: RiskSeverity.Medium,
      requested_at: '2026-03-12T00:00:00.000Z',
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

    expect(() =>
      applyApprovalResult(request, {
        approval_result_id: 'approval-result-request-mismatch',
        approval_request_id: 'approval-request-other',
        event_id: request.event_id,
        decision_id: request.decision_id,
        result: ApprovalResultStatus.Approved,
        actor_type: ApprovalActorType.User,
        acted_at: '2026-03-12T00:01:00.000Z',
        remembered: false,
      }),
    ).toThrow('Approval result request mismatch: expected approval-request-1, received approval-request-other');

    expect(() =>
      applyApprovalResult(request, {
        approval_result_id: 'approval-result-event-mismatch',
        approval_request_id: request.approval_request_id,
        event_id: 'event-other',
        decision_id: request.decision_id,
        result: ApprovalResultStatus.Denied,
        actor_type: ApprovalActorType.User,
        acted_at: '2026-03-12T00:01:00.000Z',
        remembered: false,
      }),
    ).toThrow('Approval result event mismatch: expected event-1, received event-other');

    expect(() =>
      applyApprovalResult(request, {
        approval_result_id: 'approval-result-decision-mismatch',
        approval_request_id: request.approval_request_id,
        event_id: request.event_id,
        decision_id: 'decision-other',
        result: ApprovalResultStatus.Bypassed,
        actor_type: ApprovalActorType.System,
        acted_at: '2026-03-12T00:01:00.000Z',
        remembered: false,
      }),
    ).toThrow('Approval result decision mismatch: expected decision-1, received decision-other');
  });
});
