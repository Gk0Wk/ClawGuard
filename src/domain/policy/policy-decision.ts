import { PolicyDecisionReasonCode, ResponseAction } from '../shared/index.js';

export interface PolicyDecision {
  readonly decision_id: string;
  readonly decision: ResponseAction;
  readonly reason_code: PolicyDecisionReasonCode;
  readonly reason: string;
  readonly requires_approval: boolean;
  readonly block_immediately: boolean;
  readonly can_continue: boolean;
  readonly can_remember: boolean;
  readonly derived_from_assessment_id?: string;
}

export type PolicyDecisionSemantics = Pick<
  PolicyDecision,
  'requires_approval' | 'block_immediately' | 'can_continue' | 'can_remember'
>;

export function derivePolicyDecisionSemantics(decision: ResponseAction): PolicyDecisionSemantics {
  switch (decision) {
    case ResponseAction.ApproveRequired:
      return {
        requires_approval: true,
        block_immediately: false,
        can_continue: false,
        can_remember: true,
      };
    case ResponseAction.Block:
      return {
        requires_approval: false,
        block_immediately: true,
        can_continue: false,
        can_remember: false,
      };
    case ResponseAction.Warn:
    case ResponseAction.Constrain:
    case ResponseAction.Allow:
    default:
      return {
        requires_approval: false,
        block_immediately: false,
        can_continue: true,
        can_remember: false,
      };
  }
}
