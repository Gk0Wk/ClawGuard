import type { RunRef, SessionRef, ToolCallRef } from '../shared/index.js';
import type { IsoTimestamp } from '../shared/index.js';
import { ApprovalResultStatus, AuditRecordFinalStatus, ExecutionStatus, ResponseAction } from '../shared/index.js';

export interface AuditRecord {
  readonly record_id: string;
  readonly event_id: string;
  readonly assessment_id?: string;
  readonly decision_id: string;
  readonly tool_name: ToolCallRef['tool_name'];
  readonly decision: ResponseAction;
  readonly approval_result?: ApprovalResultStatus;
  readonly execution_result?: ExecutionStatus;
  readonly timestamp: IsoTimestamp;
  readonly final_status: AuditRecordFinalStatus;
  readonly session_ref: SessionRef;
  readonly run_ref: RunRef;
  readonly tool_call_ref: ToolCallRef;
}
