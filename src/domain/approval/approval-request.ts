import type { PolicyDecision } from '../policy/index.js';
import type { RiskEvent } from '../risk/index.js';
import type { IsoTimestamp, RunRef, SessionRef, ToolCallRef } from '../shared/index.js';
import { ApprovalCategory, ApprovalResultStatus, RiskSeverity } from '../shared/index.js';

export interface ApprovalRequest {
  readonly approval_request_id: string;
  readonly event_id: RiskEvent['event_id'];
  readonly decision_id: PolicyDecision['decision_id'];
  readonly status: ApprovalResultStatus;
  readonly approval_category: ApprovalCategory;
  readonly action_title: string;
  readonly reason_code: PolicyDecision['reason_code'];
  readonly reason_summary: string;
  readonly risk_level: RiskSeverity;
  readonly impact_scope?: string;
  readonly requested_at: IsoTimestamp;
  readonly expires_at?: IsoTimestamp;
  readonly session_ref: SessionRef;
  readonly run_ref: RunRef;
  readonly tool_call_ref: ToolCallRef;
}

export function createApprovalRequest(
  request: Omit<ApprovalRequest, 'status'> & { readonly status?: ApprovalRequest['status'] },
): ApprovalRequest {
  return {
    ...request,
    status: request.status ?? ApprovalResultStatus.Pending,
  };
}
