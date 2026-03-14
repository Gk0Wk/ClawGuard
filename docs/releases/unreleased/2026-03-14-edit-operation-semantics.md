---
type: feature
scope: runtime
audience: developer
summary: Added shared edit operation semantics so workspace mutation approvals and audit text can distinguish insert, delete, modify, and rename-like edits.
breaking: false
demo_ready: true
tests:
  - node .\node_modules\vitest\vitest.mjs run tests\unit\input-normalization.test.ts tests\integration\openclaw-adapter-pipeline.test.ts tests\integration\openclaw-clawguard-plugin.test.ts
artifacts:
  - src/domain/shared/core.ts
  - src/domain/context/evaluation-input.ts
  - src/adapters/openclaw/normalization.ts
  - src/orchestration/classifier/evaluation-presentation.ts
  - plugins/openclaw-clawguard/src/routes/approvals.ts
  - tests/fixtures/workspace-mutation.ts
  - tests/unit/input-normalization.test.ts
  - tests/integration/openclaw-adapter-pipeline.test.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added a shared Core workspace-mutation operation classifier for `edit` so normalized evaluation input can carry additive `operation_type` semantics.
- Reused that shared semantic in approval titles plus risk-event summary and explanation text, keeping the plugin on the same Core approval path.
- Surfaced guidance and impact scope on the existing approvals page so edit semantics remain visible in the install demo without adding new UI surfaces.

## Why it matters

- Pending actions for workspace mutation edits now explain whether ClawGuard saw an insert, delete, modify, or rename-like edit instead of treating every `edit` as an opaque mutation.
- Audit and approval messaging stay aligned because both are derived from the same shared Core normalization output.

## Demo posture / limitations

- What this update proves: the fake-only install demo can carry richer edit semantics through the existing workspace mutation approval and audit chain.
- What this update does **not** prove: real filesystem diffs, production-grade rename detection, or broader non-edit workspace governance.
- Any demo-only / unpublished reminder: this remains install demo only, local-first, and fake-only.
