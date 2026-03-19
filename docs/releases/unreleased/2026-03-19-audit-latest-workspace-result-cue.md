---
type: fix
scope: plugin
audience: developer
summary: Audit now surfaces a latest workspace result cue alongside the existing coarse workspace result state so replay detail matches dashboard quick scan granularity more closely.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/routes/audit.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added a presentation-only `latestWorkspaceResultCue` to the Audit hero and JSON payload.
- The existing `latestWorkspaceResultState` remains in place for backward compatibility.

## Why it matters

- Audit now mirrors the dashboard/checkup quick scan more closely by showing the replay cue that was already present in the latest audit detail.
- Operators can see both the coarse workspace state and the more specific cue without opening the flow cards.

## Demo posture / limitations

- This does not change runtime state, the audit schema, or how replay flows are recorded.
- The new cue is only shown when the latest replay detail already contains a workspace result state line.
