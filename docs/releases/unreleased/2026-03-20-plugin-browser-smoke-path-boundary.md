---
type: fix
scope: plugin
audience: public
summary: "Separate browser smoke paths from protected backing routes and close the first-usable-version acceptance run."
breaking: false
demo_ready: true
tests:
  - "pnpm typecheck"
  - "pnpm test"
artifacts:
  - "plugins/openclaw-clawguard/src/routes/shared.ts"
  - "plugins/openclaw-clawguard/src/routes/dashboard.ts"
  - "plugins/openclaw-clawguard/src/routes/settings.ts"
  - "tests/integration/openclaw-clawguard-plugin.test.ts"
  - "docs/releases/2026-03-14-first-usable-version-acceptance-checklist.md"
---

## What changed

ClawGuard now exposes two explicit path lists in its install-demo metadata:

- `smokePaths` for the browser-facing public shell on `/clawguard*`
- `protectedBackingRoutes` for the protected `/plugins/clawguard/*` implementation routes

The Settings and Dashboard pages now present both lists separately, instead of showing the protected backing routes as if they were the primary browser smoke path.

The first-usable-version acceptance checklist was also marked complete after rerunning local packaging, `pnpm typecheck`, `pnpm test`, HTTP smoke, and browser smoke through the `/clawguard` connect page.

## Why it matters

This removes a real source of user confusion. The public shell is the supported browser entry, while the protected plugin routes are implementation backing routes. Mixing those two made the UI and JSON payloads contradict the README and operator runbook.

Separating them also makes the acceptance posture more defensible: the browser path is what operators should actually open, while the protected routes remain available for regression and shell-backed requests.

## Demo posture / limitations

This does **not** remove or deprecate `/plugins/clawguard/*`. Those routes are still required and remain protected by gateway auth. The change is only about presenting the browser-facing path and the protected backing path honestly and consistently during the install-demo phase.
