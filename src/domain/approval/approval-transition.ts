import { ApprovalResultStatus } from '../shared/index.js';

import type { ApprovalRequest } from './approval-request.js';
import type { ApprovalResult } from './approval-result.js';

const noApprovalTransitions: readonly ApprovalResultStatus[] = [];

const approvalTransitions = {
  [ApprovalResultStatus.Pending]: [
    ApprovalResultStatus.Approved,
    ApprovalResultStatus.Denied,
    ApprovalResultStatus.Expired,
    ApprovalResultStatus.Bypassed,
  ],
  [ApprovalResultStatus.Approved]: noApprovalTransitions,
  [ApprovalResultStatus.Denied]: noApprovalTransitions,
  [ApprovalResultStatus.Expired]: noApprovalTransitions,
  [ApprovalResultStatus.Bypassed]: noApprovalTransitions,
} satisfies Record<ApprovalResultStatus, readonly ApprovalResultStatus[]>;

export const APPROVAL_TERMINAL_STATUSES = [
  ApprovalResultStatus.Approved,
  ApprovalResultStatus.Denied,
  ApprovalResultStatus.Expired,
  ApprovalResultStatus.Bypassed,
] as const;

export function getAllowedApprovalTransitions(status: ApprovalResultStatus): readonly ApprovalResultStatus[] {
  return approvalTransitions[status];
}

export function canTransitionApprovalStatus(from: ApprovalResultStatus, to: ApprovalResultStatus): boolean {
  return (approvalTransitions[from] as readonly ApprovalResultStatus[]).includes(to);
}

export function assertApprovalStatusTransition(from: ApprovalResultStatus, to: ApprovalResultStatus): void {
  if (!canTransitionApprovalStatus(from, to)) {
    throw new Error(`Illegal approval status transition: ${from} -> ${to}`);
  }
}

export function applyApprovalResult(
  request: ApprovalRequest,
  result: ApprovalResult,
): ApprovalRequest & { readonly status: ApprovalResult['result'] } {
  assertApprovalResultLinks(request, result);
  assertApprovalStatusTransition(request.status, result.result);

  return {
    ...request,
    status: result.result,
  };
}

function assertApprovalResultLinks(request: ApprovalRequest, result: ApprovalResult): void {
  if (result.approval_request_id !== request.approval_request_id) {
    throw new Error(
      `Approval result request mismatch: expected ${request.approval_request_id}, received ${result.approval_request_id}`,
    );
  }

  if (result.event_id !== request.event_id) {
    throw new Error(`Approval result event mismatch: expected ${request.event_id}, received ${result.event_id}`);
  }

  if (result.decision_id !== request.decision_id) {
    throw new Error(`Approval result decision mismatch: expected ${request.decision_id}, received ${result.decision_id}`);
  }
}
