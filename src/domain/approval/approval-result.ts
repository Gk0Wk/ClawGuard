import type { AuditRecord } from '../audit/index.js';
import type { PolicyDecision } from '../policy/index.js';
import type { RiskEvent } from '../risk/index.js';
import type { IsoTimestamp } from '../shared/index.js';
import { ApprovalResultStatus } from '../shared/index.js';

export enum ApprovalActorType {
  User = 'user',
  System = 'system',
}

export interface ApprovalResult {
  readonly approval_result_id: string;
  readonly approval_request_id: string;
  readonly event_id: RiskEvent['event_id'];
  readonly decision_id: PolicyDecision['decision_id'];
  readonly result: Exclude<ApprovalResultStatus, ApprovalResultStatus.Pending>;
  readonly actor_type: ApprovalActorType;
  readonly acted_at: IsoTimestamp;
  readonly remembered: boolean;
  readonly audit_record_id?: AuditRecord['record_id'];
}
