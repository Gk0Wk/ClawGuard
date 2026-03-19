---
type: refactor
scope: workspace
audience: developer
summary: Added a normalized workspace result state label to structured result summaries so insert, delete, modify, and rename-like outcomes are easier to read in final audit detail.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/services/state.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- `summarizeStructuredToolResult` now adds a `workspace result state=...` fragment when the result payload exposes a clear workspace mutation state.
- The summary prefers an explicit `operation_type` value and otherwise falls back to a conservative single-field inference from `created`, `updated`, `deleted`, or `renamed`.
- The workspace replay test now asserts that the final audit detail includes the normalized state label.

## Why it matters

- Final audit detail is easier to read because the workspace result state is named directly instead of only being implied by the raw result fields.
- The change keeps workspace result interpretation aligned with the existing conservative normalization rules and does not affect exec or outbound handling.

## Demo posture / limitations

- This is still an install-demo presentation enhancement. It does not add any new workspace hook or broaden the mutation surface.
- The normalized state label only appears when the result data is clear enough to infer a single workspace outcome; mixed or ambiguous results still stay conservative.
