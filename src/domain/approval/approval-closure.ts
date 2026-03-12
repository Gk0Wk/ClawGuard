import {
  ApprovalResultStatus,
  AuditRecordFinalStatus,
  ExecutionStatus,
  ResponseAction,
  RiskEventStatus,
} from '../shared/index.js';

import type { ApprovalRequest } from './approval-request.js';
import type { ApprovalResult } from './approval-result.js';
import { applyApprovalResult } from './approval-transition.js';

export interface ApprovalClosureOutcome {
  readonly approval_request: ApprovalRequest & { readonly status: ApprovalResult['result'] };
  readonly approval_result: ApprovalResult;
  readonly decision_outcome: ResponseAction.Allow | ResponseAction.Block;
  // This closes the approval phase only; it does not imply the guarded action already finished executing.
  readonly risk_event_status: RiskEventStatus;
  // Present only when approval closure itself determines enforcement, such as deny or expiry.
  readonly execution_result?: ExecutionStatus;
  readonly audit_record_final_status: AuditRecordFinalStatus;
}

export function resolveApprovalClosure(
  request: ApprovalRequest,
  result: ApprovalResult,
): ApprovalClosureOutcome {
  const approval_request = applyApprovalResult(request, result);

  switch (result.result) {
    case ApprovalResultStatus.Approved:
      return buildContinuationClosureOutcome(approval_request, result);
    case ApprovalResultStatus.Denied:
      return {
        approval_request,
        approval_result: result,
        decision_outcome: ResponseAction.Block,
        risk_event_status: RiskEventStatus.Denied,
        execution_result: ExecutionStatus.Blocked,
        audit_record_final_status: AuditRecordFinalStatus.Blocked,
      };
    case ApprovalResultStatus.Expired:
      return {
        approval_request,
        approval_result: result,
        decision_outcome: ResponseAction.Block,
        risk_event_status: RiskEventStatus.Blocked,
        execution_result: ExecutionStatus.Blocked,
        audit_record_final_status: AuditRecordFinalStatus.Blocked,
      };
    case ApprovalResultStatus.Bypassed:
      return buildContinuationClosureOutcome(approval_request, result);
    default: {
      const unsupportedResult: never = result.result;

      throw new Error(`Unsupported approval result: ${unsupportedResult}`);
    }
  }
}

function buildContinuationClosureOutcome(
  approval_request: ApprovalRequest & { readonly status: ApprovalResult['result'] },
  result: ApprovalResult,
): ApprovalClosureOutcome {
  return {
    approval_request,
    approval_result: result,
    decision_outcome: ResponseAction.Allow,
    // Both approved and bypassed mean the approval gate no longer blocks continuation.
    // The exact gate outcome still lives on approval_result.result.
    risk_event_status: RiskEventStatus.Approved,
    audit_record_final_status: AuditRecordFinalStatus.Logged,
  };
}
