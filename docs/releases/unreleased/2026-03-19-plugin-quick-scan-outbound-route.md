---
type: fix
scope: plugin
audience: developer
summary: Added the latest outbound route target to the dashboard and checkup quick-scan summary.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Extended the shared `Recent audit quick scan` on the dashboard and checkup pages so it can show the latest parsed `Outbound route` alongside the existing workspace result state and route mode cues.
- The quick scan still reads from existing audit detail text and only renders the new field when a recent audit entry actually contains an outbound route.
- Updated the plugin integration test to pin the new quick-scan route text on both pages.

## Why it matters

- Operators can now see not just that recent outbound activity used an explicit or implicit route, but also which target the latest outbound replay was trying to reach.
- This makes the landing pages more useful as a quick triage surface before opening the full Audit timeline.

## Demo posture / limitations

- This is presentation-only and does not change any runtime state, audit schema, or route capture logic.
- If the recent audit slice does not contain an outbound route string, the quick scan keeps the previous conservative layout.
