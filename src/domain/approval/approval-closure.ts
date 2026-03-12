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
  readonly risk_event_status: RiskEventStatus;
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
      return {
        approval_request,
        approval_result: result,
        decision_outcome: ResponseAction.Allow,
        risk_event_status: RiskEventStatus.Approved,
        audit_record_final_status: AuditRecordFinalStatus.Logged,
      };
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
      return {
        approval_request,
        approval_result: result,
        decision_outcome: ResponseAction.Allow,
        risk_event_status: RiskEventStatus.Allowed,
        audit_record_final_status: AuditRecordFinalStatus.Logged,
      };
    default: {
      const unsupportedResult: never = result.result;

      throw new Error(`Unsupported approval result: ${unsupportedResult}`);
    }
  }
}
