---
type: refactor
scope: plugin
audience: developer
summary: Exposed the recent-audit quick-scan cues in the dashboard JSON payload alongside the existing HTML summary.
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

- Refactored dashboard recent-audit quick-scan extraction into a reusable builder so the same parsed cues can drive both HTML and JSON output.
- Added `recentAudit.quickScan` to the dashboard JSON payload with `workspaceResultState`, `outboundRouteMode`, and `outboundRoute` when those cues already exist in the latest relevant audit entries.
- Kept the field set conservative: missing cues are omitted instead of being synthesized.

## Why it matters

- Programmatic consumers of the dashboard route now receive the same short replay summary that human operators already see in the quick-scan block.
- This keeps the dashboard HTML and JSON surfaces aligned without introducing a separate parsing path.

## Demo posture / limitations

- This is presentation-layer data shaping only. It does not change audit capture, state persistence, or approval behavior.
- The new JSON quick-scan fields are only present when the recent audit slice already contains those parsed cues.
