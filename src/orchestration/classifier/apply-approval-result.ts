import { resolveApprovalClosure, type ApprovalRequest, type ApprovalResult } from '../../domain/approval/index.js';
import type { AuditRecord } from '../../domain/audit/index.js';
import type { RiskEvent } from '../../domain/risk/index.js';

import type { EvaluationArtifacts } from './build-evaluation-artifacts.js';

export type ApprovalIntegratedArtifacts = Omit<EvaluationArtifacts, 'approval_request'> & {
  readonly approval_request: ApprovalRequest & { readonly status: ApprovalResult['result'] };
  readonly approval_result: ApprovalResult;
};

export function applyApprovalResultToEvaluationArtifacts(
  artifacts: EvaluationArtifacts,
  approvalResult: ApprovalResult,
): ApprovalIntegratedArtifacts {
  const approvalRequest = artifacts.approval_request;
  if (!approvalRequest) {
    throw new Error('Cannot apply approval result to artifacts without an approval request.');
  }

  assertApprovalArtifactsLinkage(artifacts, approvalRequest);

  const closure = resolveApprovalClosure(approvalRequest, approvalResult);
  const linkedApprovalResult: ApprovalResult = {
    ...approvalResult,
    audit_record_id: artifacts.audit_record.record_id,
  };

  return {
    ...artifacts,
    approval_request: closure.approval_request,
    approval_result: linkedApprovalResult,
    risk_event: applyApprovalClosureToRiskEvent(artifacts.risk_event, closure.risk_event_status),
    audit_record: applyApprovalClosureToAuditRecord(
      artifacts.audit_record,
      linkedApprovalResult,
      closure.execution_result,
      closure.audit_record_final_status,
    ),
  };
}

function assertApprovalArtifactsLinkage(artifacts: EvaluationArtifacts, approvalRequest: ApprovalRequest): void {
  if (approvalRequest.event_id !== artifacts.risk_event.event_id) {
    throw new Error(
      `Approval request event mismatch: expected ${artifacts.risk_event.event_id}, received ${approvalRequest.event_id}`,
    );
  }

  if (approvalRequest.event_id !== artifacts.audit_record.event_id) {
    throw new Error(
      `Approval request audit event mismatch: expected ${artifacts.audit_record.event_id}, received ${approvalRequest.event_id}`,
    );
  }

  if (approvalRequest.decision_id !== artifacts.policy_decision.decision_id) {
    throw new Error(
      `Approval request decision mismatch: expected ${artifacts.policy_decision.decision_id}, received ${approvalRequest.decision_id}`,
    );
  }

  if (approvalRequest.decision_id !== artifacts.risk_event.decision_id) {
    throw new Error(
      `Approval request risk decision mismatch: expected ${artifacts.risk_event.decision_id}, received ${approvalRequest.decision_id}`,
    );
  }

  if (approvalRequest.decision_id !== artifacts.audit_record.decision_id) {
    throw new Error(
      `Approval request audit decision mismatch: expected ${artifacts.audit_record.decision_id}, received ${approvalRequest.decision_id}`,
    );
  }
}

function applyApprovalClosureToRiskEvent(riskEvent: RiskEvent, status: RiskEvent['status']): RiskEvent {
  return {
    ...riskEvent,
    status,
  };
}

function applyApprovalClosureToAuditRecord(
  auditRecord: AuditRecord,
  approvalResult: ApprovalResult,
  executionResult: AuditRecord['execution_result'],
  finalStatus: AuditRecord['final_status'],
): AuditRecord {
  return {
    ...auditRecord,
    approval_result: approvalResult.result,
    approval_result_id: approvalResult.approval_result_id,
    execution_result: executionResult ?? auditRecord.execution_result,
    final_status: finalStatus,
  };
}
