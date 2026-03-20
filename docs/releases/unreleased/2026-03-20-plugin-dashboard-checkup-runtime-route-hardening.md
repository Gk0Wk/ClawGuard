---
type: fix
scope: plugin
audience: developer
summary: Harden dashboard and checkup page routing for real OpenClaw installs
breaking: false
demo_ready: true
tests:
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - plugins/openclaw-clawguard/src/index.ts
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - plugins/openclaw-clawguard/src/routes/checkup.ts
  - plugins/openclaw-clawguard/src/routes/shared.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

ClawGuard now registers the plugin-owned `dashboard` and `checkup` pages with prefix route matching instead of exact-only matching, while keeping the handlers themselves pinned to the canonical page path. The page handlers also normalize a trailing slash before deciding whether to serve the request.

## Why it matters

In the real OpenClaw runtime, the install-demo plugin could load successfully and still return `404 Not Found` for `dashboard` and `checkup`, even though the same build exposed `approvals`, `audit`, and `settings`. Hardening the page route registration and handler pathname checks makes the read-only control-surface entry pages resilient to runtime pathname normalization differences.

## Demo posture / limitations

This does not broaden ClawGuard coverage. It only makes the existing plugin-owned Alpha pages reachable more reliably in a local install-demo. The demo is still unpublished, fake-only, and not a stock Control UI Security tab.
