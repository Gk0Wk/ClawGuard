---
type: refactor
scope: outbound
audience: developer
summary: Expose the latest outbound route mode alongside the latest replay cues in Audit.
breaking: false
demo_ready: true
tests:
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
  - pnpm typecheck
artifacts:
  - plugins/openclaw-clawguard/src/routes/audit.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

The Audit route now surfaces `latestOutboundRouteMode` next to the existing `latestOutboundRoute` and `latestWorkspaceResultState` cues. The latest replay hero also renders the outbound route mode when a recent replay detail already contains it.

## Why it matters

Dashboard and Checkup already expose outbound route mode inside their recent-audit quick scan. Adding the same cue to Audit keeps the latest replay summary and JSON payload aligned, so operators and downstream consumers do not need to recalculate route mode from individual flow events.

## Demo posture / limitations

This is still a presentation-only cue parsed from existing replay detail. It does not add new outbound hooks, delivery retries, or a broader host integration surface.
