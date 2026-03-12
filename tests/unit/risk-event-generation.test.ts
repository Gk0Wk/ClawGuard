import { buildOpenClawEvaluationArtifacts } from '../../src/index.js';
import { sprint0Fixtures } from '../fixtures/index.js';

import { describe, expect, it } from 'vitest';

describe('Sprint 0 RiskEvent generation', () => {
  it.each(sprint0Fixtures)('builds a linked risk event for $name', (fixture) => {
    const artifacts = buildOpenClawEvaluationArtifacts(fixture.args);

    expect(artifacts.risk_event).toMatchObject({
      event_type: fixture.expected.type ?? artifacts.risk_event.event_type,
      recommended_action: fixture.expected.decision,
      risk_domain: fixture.expected.risk_domain,
      run_ref: artifacts.run_ref,
      session_ref: artifacts.session_ref,
      status: fixture.expected.risk_event_status,
      tool_call_ref: artifacts.tool_call_ref,
    });
  });
});
