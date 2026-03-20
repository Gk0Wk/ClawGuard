---
type: feature
scope: plugin
audience: public
summary: Add a public same-origin ClawGuard shell entry at /clawguard for tokenized dashboard flows
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

ClawGuard now exposes a plugin-owned public shell at `/clawguard` in addition to the protected `/plugins/clawguard/*` routes. The shell is same-origin with the tokenized OpenClaw dashboard URL and can reuse the current tab token to load the protected dashboard, checkup, approvals, audit, and settings pages behind the scenes.

The plugin README now documents `/clawguard` as the primary user entry path. The old companion userscript remains in the repo as a development fallback, but it is no longer the recommended path for ordinary demo usage.

## Why it matters

Direct browser navigation to `/plugins/clawguard/*` still returns `401 Unauthorized` because OpenClaw expects a gateway `Authorization` header for those protected routes. The new `/clawguard` shell gives ClawGuard a no-core-patch way to enter the same control surface from the official tokenized dashboard flow instead of requiring a separate browser userscript.

This also creates a user-facing URL shape that is easier to explain in demos: take the official tokenized dashboard URL from `openclaw dashboard --no-open`, replace its path with `/clawguard`, and the ClawGuard shell can load the protected pages from there.

## Demo posture / limitations

This still does not create a native OpenClaw left-nav `Security` tab, and it does not change OpenClaw's underlying browser auth model. Protected `/plugins/clawguard/*` routes still return `401` when opened directly without a gateway auth header.

The supported install-demo browser path is now:

- official tokenized dashboard URL -> replace path with `/clawguard`
- or open `/clawguard#token=<gateway-token>` directly on the same origin

This remains Alpha install-demo only, local-only, unpublished, and fake-only.
