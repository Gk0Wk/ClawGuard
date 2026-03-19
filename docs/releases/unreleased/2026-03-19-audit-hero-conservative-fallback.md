---
type: test
scope: audit
audience: developer
summary: Added a regression test that keeps the Audit hero quiet when the recent replay does not contain an outbound route or workspace result state.
breaking: false
demo_ready: true
tests:
  - pnpm vitest run tests/integration/openclaw-clawguard-plugin.test.ts
  - pnpm typecheck
  - pnpm test
artifacts:
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added an integration test that drives a recent replay with only an exec event, then checks the Audit page.
- The test asserts that the Audit hero does not render the `Latest outbound route in recent replay` or `Latest workspace result state in recent replay` lines when those signals are absent.

## Why it matters

- This locks in the conservative fallback behavior for the Audit hero so it only shows the route/state highlights when the replay actually contains them.
- The coverage is pure regression protection and does not alter the production audit renderer.

## Demo posture / limitations

- This is test-only coverage. It does not change the Audit hero, route parsing, or audit storage.
- The project remains Alpha, install-demo only, unpublished, and fake-only.
