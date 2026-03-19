---
type: fix
scope: workspace
audience: developer
summary: Workspace result detail now preserves explicit created/updated/deleted/renamed fields when the host provides them, while keeping the existing fallback summary path.
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

- `summarizeStructuredToolResult()` now recognizes explicit workspace result fields such as `created`, `updated`, `deleted`, and `renamed` when they are present.
- The new field-specific segments are appended to the existing summary flow, so missing fields still fall back to the prior `status`/`paths` logic.

## Why it matters

- Workspace closure audits can now carry slightly richer, more explicit result-state information when the host emits it.
- The change stays conservative: no new behavior is invented when the result payload does not provide these fields.

## Demo posture / limitations

- This only improves the audit text for structured workspace results.
- It does not change the approval flow, outbound behavior, page layout, or any normalization rules.
