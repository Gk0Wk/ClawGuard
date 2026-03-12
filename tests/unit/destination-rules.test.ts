import { describe, expect, it } from 'vitest';

import { ResponseAction, matchDestinationRules, matchDestinationRulesForEvaluationInput } from '../../src/index.js';

describe('destination rules', () => {
  it.each([
    {
      target: 'https://hooks.slack.com/services/T00000000/B00000000/very-secret-token',
      rule_id: 'destination.public-webhook-url',
      match_scope: 'destination.public_webhook_url',
      matched_value: 'https://hooks.slack.com/services/T00000000/B00000000/very-secret-token',
    },
    {
      target: 'https://api.example.test/v1/outbound',
      rule_id: 'destination.public-generic-url',
      match_scope: 'destination.public_generic_url',
      matched_value: 'https://api.example.test/v1/outbound',
    },
    {
      target: 'http://198.51.100.24:8080/collect',
      rule_id: 'destination.direct-ip-target',
      match_scope: 'destination.direct_ip_target',
      matched_value: '198.51.100.24',
    },
  ])('returns explainable destination matches for $rule_id', ({ target, rule_id, match_scope, matched_value }) => {
    const matches = matchDestinationRules(target);

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule_id,
          match_scope,
          matched_value,
          reason: expect.stringContaining(`Matched destination feature: ${match_scope}`),
          summary: expect.any(String),
        }),
      ]),
    );
  });

  it('downgrades generic public URLs to warning-level review instead of approval-only treatment', () => {
    expect(matchDestinationRules('https://api.example.test/v1/outbound')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule_id: 'destination.public-generic-url',
          match_scope: 'destination.public_generic_url',
          recommended_action: ResponseAction.Warn,
          reason: expect.stringContaining('not treated as an obviously malicious endpoint'),
        }),
      ]),
    );
  });

  it('reads the normalized destination target from evaluation input', () => {
    const matches = matchDestinationRulesForEvaluationInput({
      destination: {
        kind: 'channel',
        target: 'https://api.example.test/webhooks/public',
      },
    });

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule_id: 'destination.public-webhook-url',
        }),
      ]),
    );
  });

  it.each([
    'http://127.0.0.1:3000/webhooks/dev',
    'http://10.24.8.12:8080/collect',
    'https://intranet.internal/webhooks/team-sync',
    'https://build.local/api/outbound',
    'public-room',
  ])('does not flag internal, local, or private destinations for %s', (target) => {
    expect(matchDestinationRules(target)).toEqual([]);
  });
});
