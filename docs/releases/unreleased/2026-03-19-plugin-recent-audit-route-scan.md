---
type: refactor
scope: plugin
audience: developer
summary: Keep the control-surface quick scan anchored to the latest relevant audit entry per lane.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

The control-surface `Recent audit quick scan` now reads each lane from the latest relevant audit entry instead of scanning the entire replay separately for every field. Workspace result state is taken from the latest workspace-relevant entry, and outbound route details are taken from the latest outbound-relevant entry.

That keeps `Workspace result state`, `Outbound route mode`, and `Outbound route` aligned to the same recent entry for their lane instead of mixing values from different audit rows.

## Why it matters

Operators can now trust the quick scan as a coherent summary of the latest lane-specific replay signal. That makes the dashboard and checkup views more useful without broadening runtime scope or changing the audit model.

## Demo posture / limitations

This is still a control-surface presentation change only. It does not alter routing, approval policy, persistence, or any runtime state schema. If a lane does not have a matching recent audit entry, the corresponding quick-scan line stays hidden.
