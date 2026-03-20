---
type: fix
scope: plugin
audience: public
summary: Keep ClawGuard approval mutations off the public shell route family
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

The `/clawguard` public shell keeps its browser-facing navigation and link-rewrite behavior, but it no longer exposes live approval mutations on the public route family. Public-shell approval forms remain browser-side proxies that use the current tab gateway token to submit against the protected approvals action path.

The public-shell route now returns `405 Method not allowed` for direct `POST` requests, and the plugin README was corrected so it no longer claims that `/clawguard/approvals/:pendingActionId/(approve|deny)` is a supported public mutation surface.

## Why it matters

`/clawguard` is intentionally a no-core-patch public browser entry path. Allowing live approval mutations directly on that route family would weaken the boundary between the public shell surface and the protected `/plugins/clawguard/*` control surface.

Keeping approval state changes on the protected route family preserves the intended model: the public shell handles browser usability, while the actual sensitive mutation still depends on the gateway-authenticated path.

## Demo posture / limitations

This still does not make raw `/plugins/clawguard/*` routes public, and it still does not create a native OpenClaw left-nav `Security` tab. The stable browser claim remains narrower: `/clawguard*` is the supported no-core-patch browser entry and navigation surface, while live approval mutations still flow through the protected approvals action path behind the scenes.

This remains Alpha install-demo behavior, local-only, unpublished, and fake-only.
