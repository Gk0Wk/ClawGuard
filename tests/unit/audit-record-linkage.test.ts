import { buildOpenClawEvaluationArtifacts } from '../../src/index.js';
import { sprint0Fixtures } from '../fixtures/index.js';

import { describe, expect, it } from 'vitest';

describe('Sprint 0 AuditRecord linkage', () => {
  it.each(sprint0Fixtures)('links audit data for $name', (fixture) => {
    const artifacts = buildOpenClawEvaluationArtifacts(fixture.args);

    expect(artifacts.risk_event.decision_id).toBe(artifacts.policy_decision.decision_id);
    expect(artifacts.policy_decision.decision).toBe(fixture.expected.decision);
    expect(artifacts.audit_record).toMatchObject({
      decision: artifacts.policy_decision.decision,
      decision_id: artifacts.policy_decision.decision_id,
      event_id: artifacts.risk_event.event_id,
      final_status: fixture.expected.audit_final_status,
      run_ref: artifacts.run_ref,
      session_ref: artifacts.session_ref,
      tool_call_ref: artifacts.tool_call_ref,
      tool_name: artifacts.tool_call_ref.tool_name,
    });

    if (artifacts.approval_request) {
      expect(artifacts.approval_request).toMatchObject({
        decision_id: artifacts.policy_decision.decision_id,
        event_id: artifacts.risk_event.event_id,
        reason_code: artifacts.policy_decision.reason_code,
      });
    }
  });
});
