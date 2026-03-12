import * as clawguard from '../../src/index.js';

import { describe, expect, it } from 'vitest';

describe('Sprint 0 bootstrap', () => {
  it('loads the public Sprint 0 entrypoints', () => {
    expect(clawguard.normalizeOpenClawInputs).toBeTypeOf('function');
    expect(clawguard.buildOpenClawEvaluationArtifacts).toBeTypeOf('function');
  });
});
