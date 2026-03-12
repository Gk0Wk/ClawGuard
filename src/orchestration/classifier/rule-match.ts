import { ResponseAction, RiskDomain, RiskSeverity } from '../../domain/shared/index.js';

export type FastPathRuleKind = 'fastpath.command' | 'fastpath.path' | 'fastpath.secret' | 'fastpath.destination';

export interface FastPathRuleMatch {
  readonly rule_id: string;
  readonly kind: FastPathRuleKind;
  readonly risk_domain: RiskDomain;
  readonly severity: RiskSeverity;
  readonly recommended_action: ResponseAction;
  readonly summary: string;
  readonly reason: string;
  readonly match_scope: string;
  readonly matched_value: string;
}
