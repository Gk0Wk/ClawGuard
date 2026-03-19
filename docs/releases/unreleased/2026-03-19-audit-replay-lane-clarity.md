---
type: refactor
scope: plugin
audience: developer
summary: Clarify audit replay titles for workspace results and host-level outbound lanes
breaking: false
demo_ready: true
tests:
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
  - pnpm typecheck
artifacts:
  - plugins/openclaw-clawguard/src/routes/audit.ts
  - plugins/openclaw-clawguard/src/routes/shared.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

The Audit replay view now surfaces workspace result-state labels in flow titles when a workspace replay closes with a structured result, such as `write replay (insert)`. It also distinguishes host-level direct outbound from the generic direct-audit lane, so replay cards and handoff copy now say when a `message_sending` flow never entered Approvals and should be interpreted only from Audit.

## Why it matters

This tightens the operator-facing replay model without changing hooks, schemas, or decisions. Workspace closures are easier to scan for insert/modify/delete style outcomes, and outbound replay no longer hides the important boundary between tool-level approval flows and host-level direct outbound that can only block or close in Audit.

## Demo posture / limitations

This remains install-demo-only UI copy and replay labeling. It does not add new hooks, broaden workspace heuristics, or turn host-level outbound into an approval-capable lane.
