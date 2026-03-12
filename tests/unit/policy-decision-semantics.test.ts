import { describe, expect, it } from 'vitest';

import { derivePolicyDecisionSemantics, ResponseAction } from '../../src/index.js';

describe('policy decision semantics', () => {
  it('maps warn to continue with a warning', () => {
    const semantics = derivePolicyDecisionSemantics(ResponseAction.Warn);

    expect(semantics.can_continue).toBe(true);
    expect(semantics.requires_approval).toBe(false);
    expect(semantics.block_immediately).toBe(false);
    expect(semantics.can_remember).toBe(false);
  });

  it('keeps allow semantics permissive without approval', () => {
    expect(derivePolicyDecisionSemantics(ResponseAction.Allow)).toEqual({
      requires_approval: false,
      block_immediately: false,
      can_continue: true,
      can_remember: false,
    });
  });

  it('keeps approve-required semantics waiting for user approval', () => {
    expect(derivePolicyDecisionSemantics(ResponseAction.ApproveRequired)).toEqual({
      requires_approval: true,
      block_immediately: false,
      can_continue: false,
      can_remember: true,
    });
  });

  it('keeps block semantics as immediate stop', () => {
    expect(derivePolicyDecisionSemantics(ResponseAction.Block)).toEqual({
      requires_approval: false,
      block_immediately: true,
      can_continue: false,
      can_remember: false,
    });
  });

  it('keeps constrain semantics non-blocking but still executable under limits', () => {
    expect(derivePolicyDecisionSemantics(ResponseAction.Constrain)).toEqual({
      requires_approval: false,
      block_immediately: false,
      can_continue: true,
      can_remember: false,
    });
  });
});
