import { describe, expect, it } from 'vitest';

import { selectPrimaryRuleMatch } from '../../src/orchestration/classifier/evaluation-outcomes.js';
import type { FastPathRuleMatch } from '../../src/orchestration/classifier/rule-match.js';
import { ResponseAction, RiskDomain, RiskSeverity } from '../../src/index.js';

function createRuleMatch(overrides: Partial<FastPathRuleMatch> = {}): FastPathRuleMatch {
  return {
    rule_id: overrides.rule_id ?? 'rule.default',
    kind: overrides.kind ?? 'fastpath.command',
    risk_domain: overrides.risk_domain ?? RiskDomain.Execution,
    severity: overrides.severity ?? RiskSeverity.Medium,
    recommended_action: overrides.recommended_action ?? ResponseAction.Warn,
    summary: overrides.summary ?? 'Default summary',
    reason: overrides.reason ?? 'Default reason',
    match_scope: overrides.match_scope ?? 'command',
    matched_value: overrides.matched_value ?? 'demo',
  };
}

describe('evaluation outcomes', () => {
  it('prefers higher severity before action strength', () => {
    const warnCritical = createRuleMatch({
      rule_id: 'rule.critical.warn',
      severity: RiskSeverity.Critical,
      recommended_action: ResponseAction.Warn,
    });
    const blockHigh = createRuleMatch({
      rule_id: 'rule.high.block',
      severity: RiskSeverity.High,
      recommended_action: ResponseAction.Block,
    });

    expect(selectPrimaryRuleMatch([blockHigh, warnCritical])).toBe(warnCritical);
  });

  it('uses stronger recommended action when severities tie', () => {
    const warnHigh = createRuleMatch({
      rule_id: 'rule.high.warn',
      severity: RiskSeverity.High,
      recommended_action: ResponseAction.Warn,
    });
    const approveHigh = createRuleMatch({
      rule_id: 'rule.high.approve',
      severity: RiskSeverity.High,
      recommended_action: ResponseAction.ApproveRequired,
    });

    expect(selectPrimaryRuleMatch([warnHigh, approveHigh])).toBe(approveHigh);
  });

  it('keeps caller-provided order for exact ties', () => {
    const first = createRuleMatch({
      rule_id: 'rule.first',
      severity: RiskSeverity.High,
      recommended_action: ResponseAction.ApproveRequired,
    });
    const second = createRuleMatch({
      rule_id: 'rule.second',
      severity: RiskSeverity.High,
      recommended_action: ResponseAction.ApproveRequired,
    });

    expect(selectPrimaryRuleMatch([first, second])).toBe(first);
    expect(selectPrimaryRuleMatch([second, first])).toBe(second);
  });
});
