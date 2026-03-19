---
type: fix
scope: plugin
audience: developer
summary: Added a quick-scan audit summary to dashboard and checkup so recent workspace result states and outbound route modes are easier to read at a glance.
breaking: false
demo_ready: true
tests:
  - pnpm vitest run tests/integration/openclaw-clawguard-plugin.test.ts
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - plugins/openclaw-clawguard/src/routes/checkup.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added a small recent-audit quick scan block to the dashboard and checkup pages.
- The new block pulls already-existing `workspace result state` and `Route mode` details out of the recent audit slice so operators can scan the latest workspace/outbound posture without opening Audit.
- Updated the integration test to pin the new presentation text on both pages.

## Why it matters

- The dashboard and checkup pages now surface the shortest useful summary for the most recent workspace and outbound audit signals.
- This makes the control surface faster to scan while keeping the page structure and all runtime behavior unchanged.

## Demo posture / limitations

- This is presentation-only. It does not add new hooks, state, routing, or audit behavior.
- The project remains Alpha, install-demo only, unpublished, and fake-only.
