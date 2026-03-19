---
type: refactor
scope: plugin
audience: developer
summary: Added a shared install-demo coverage matrix to dashboard and checkup so the current exec, outbound, and workspace lanes stay explicit.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/routes/shared.ts
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - plugins/openclaw-clawguard/src/routes/checkup.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added a shared coverage matrix helper for the plugin control surface that spells out the current `exec`, `outbound`, and `workspace` lanes.
- Wired that matrix into both `dashboard` and `checkup` so the install-demo boundary is visible in the light status view and the deeper explanation view.
- Extended the control-surface integration tests to assert that the shared coverage legend stays visible on both pages.

## Why it matters

- The install-demo boundary is now easier to understand without reading long posture paragraphs or cross-referencing README text.
- This keeps the control surface aligned with the active roadmap: operators can see that `exec`, `outbound`, and `workspace mutation` are the three real lanes being hardened right now.

## Demo posture / limitations

- This is presentation-only. It does not add new hooks, broader workspace coverage, or a larger outbound lifecycle.
- The matrix still reflects the current fake-only Alpha surface: tool-level outbound remains minimal, host-level direct outbound remains hard-block only, and workspace mutation coverage stays limited to `write` / `edit` / `apply_patch`.
