---
type: refactor
scope: plugin
audience: developer
summary: Dashboard and Checkup now expose a workspace result cue alongside the existing quick-scan workspace field.
breaking: false
demo_ready: true
tests:
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
  - pnpm typecheck
artifacts:
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

The recent-audit quick scan now emits `workspaceResultCue` in addition to the existing `workspaceResultState` field. The HTML quick scan also labels the workspace line as a cue, so the control surface can describe the latest replay detail more precisely without removing the older JSON field.

## Why it matters

Audit already exposes `latestWorkspaceResultCue`, but Dashboard and Checkup previously only surfaced the same detail through the older `workspaceResultState` name. Adding the explicit cue field keeps the control-surface JSON and HTML more self-explanatory while preserving the existing payload field for compatibility.

## Demo posture / limitations

This is a presentation-only control-surface change. It does not add new hooks, runtime state, or broader workspace coverage beyond the current fake-only install-demo lanes.
