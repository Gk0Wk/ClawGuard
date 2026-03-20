---
type: feature
scope: plugin
audience: public
summary: Let the ClawGuard public shell handle approvals actions on /clawguard/approvals/*
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - plugins/openclaw-clawguard/src/routes/public-shell.ts
  - plugins/openclaw-clawguard/src/index.ts
  - plugins/openclaw-clawguard/README.md
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

The `/clawguard` public shell is no longer GET-only. It now accepts approval actions on `/clawguard/approvals/:pendingActionId/approve` and `/clawguard/approvals/:pendingActionId/deny`, mirrors the protected approvals route's state transition rules, and redirects back to `/clawguard/approvals` after the action closes.

The plugin README now documents that public-shell approval submits no longer depend on the protected `/plugins/clawguard/approvals/*` action paths.

## Why it matters

Before this change, the public shell could rewrite approval form actions for browser usage, but the shell route itself still behaved like a read-only wrapper. That left approval submits partly dependent on JavaScript interception and on the protected approvals action surface.

Handling approvals directly on `/clawguard/approvals/*` makes the public shell a more complete browser-facing control surface: the operator can stay on the public route family for both navigation and approval actions instead of slipping back toward the protected route family.

## Demo posture / limitations

This still does not make raw `/plugins/clawguard/*` routes public, and it still does not create a native OpenClaw left-nav `Security` tab. The public shell remains the supported no-core-patch browser path.

This is still Alpha install-demo behavior, local-only, unpublished, and fake-only.
