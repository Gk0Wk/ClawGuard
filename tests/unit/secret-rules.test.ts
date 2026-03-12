import { describe, expect, it } from 'vitest';

import { ResponseAction, matchSecretRules } from '../../src/index.js';

describe('secret rules', () => {
  it.each([
    {
      input: ['Authorization: Bearer github_pat_1234567890_abcdefghijklmnopqrstuvwxyz'],
      matched_value: 'github_pat_1234567890_abcdefghijklmnopqrstuvwxyz',
      rule_id: 'secret.token.pattern',
      recommended_action: ResponseAction.ApproveRequired,
    },
    {
      input: ['OPENAI_API_KEY=sk-live-1234567890abcdef'],
      matched_value: 'sk-live-1234567890abcdef',
      rule_id: 'secret.api-key.pattern',
      recommended_action: ResponseAction.Block,
    },
    {
      input: ['-----BEGIN OPENSSH PRIVATE KEY-----'],
      matched_value: '-----BEGIN OPENSSH PRIVATE KEY-----',
      rule_id: 'secret.private-key.pattern',
      recommended_action: ResponseAction.Block,
    },
    {
      input: ['APP_SECRET="prod_super_secret_12345"'],
      matched_value: 'APP_SECRET=prod_super_secret_12345',
      rule_id: 'secret.config-field.pattern',
      recommended_action: ResponseAction.ApproveRequired,
    },
  ])('returns explainable matches for $rule_id', ({ input, matched_value, rule_id, recommended_action }) => {
    const matches = matchSecretRules(input);

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          matched_value,
          match_scope: expect.any(String),
          reason: expect.stringContaining(`Matched: ${matched_value}`),
          recommended_action,
          rule_id,
          summary: expect.any(String),
        }),
      ]),
    );
  });

  it.each([
    ['API_KEY=demo-key'],
    ['TOKEN=example-token-value'],
    ['Remember the secret handshake for later.'],
    ['This changelog mentions chmod 777 as text, not a credential.'],
  ])('avoids low-confidence placeholder or prose matches for %s', (input) => {
    expect(matchSecretRules([input])).toEqual([]);
  });
});
