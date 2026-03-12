import { ResponseAction } from '../shared/index.js';

export interface PolicyDecision {
  readonly decision_id: string;
  readonly decision: ResponseAction;
  readonly reason: string;
  readonly requires_approval: boolean;
  readonly block_immediately: boolean;
  readonly can_continue: boolean;
  readonly can_remember: boolean;
  readonly derived_from_assessment_id?: string;
}
