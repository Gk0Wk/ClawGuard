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
  // undefined means the action never entered an approval phase; pending/final results track the approval gate itself.
  readonly approval_result?: ApprovalResultStatus;
  readonly approval_result_id?: string;
  readonly execution_result?: ExecutionStatus;
  readonly timestamp: IsoTimestamp;
  readonly final_status: AuditRecordFinalStatus;
  readonly session_ref: SessionRef;
  readonly run_ref: RunRef;
  readonly tool_call_ref: ToolCallRef;
}
