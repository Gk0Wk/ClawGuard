---
type: refactor
scope: plugin
audience: developer
summary: Aligned dashboard and checkup lane-pressure copy so the main drag and first fix now point at the same live domain split.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - plugins/openclaw-clawguard/src/routes/shared.ts
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - plugins/openclaw-clawguard/src/routes/checkup.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added a read-only lane-pressure summary helper in the shared control-surface route layer.
- Dashboard and checkup now surface the dominant named lane from the approvals queue and tie that lane directly to the main drag / first fix copy.
- The recent audit lane split still renders separately, but it now uses the same lane vocabulary so the two page views stay aligned.

## Why it matters

- Operators can see which of `exec`, `outbound`, or `workspace` is currently the heaviest lane without jumping between different phrases.
- The dashboard summary and checkup explanation now point at the same live pressure source, which makes the "main drag" and "fix first" guidance easier to act on.

## Demo posture / limitations

- This is still a presentation-layer alignment only. It does not change the state schema or the actual approval logic.
- The lane summary is derived from the existing live queue and recent audit counts, so it remains bounded to the current install-demo control surface.
