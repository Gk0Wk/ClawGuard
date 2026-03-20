---
type: feature
scope: plugin
audience: public
summary: Keep ClawGuard public-shell navigation and approval actions on /clawguard
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - plugins/openclaw-clawguard/src/routes/public-shell.ts
  - plugins/openclaw-clawguard/README.md
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

The `/clawguard` public shell now keeps its own browser flow instead of only proxy-loading the protected `/plugins/clawguard/*` pages. It caches the tokenized `#token=...` bootstrap token in tab-scoped session storage, preserves that tokenized hash during shell navigation, and rewrites protected page links plus approval form actions back onto the `/clawguard*` surface after each protected page render.

The plugin README was updated to explain that `/clawguard` is no longer just an entry shim. It now remains the stable browser-facing surface for same-tab navigation across Dashboard, Checkup, Approvals, Audit, and Settings.

## Why it matters

Without this rewrite layer, the shell could load the first protected page but still leave raw `/plugins/clawguard/*` links and approval actions in the rendered HTML. That made copy-link, same-tab navigation, and tokenized `#token=...` flows easier to fall back onto the protected routes that still return `401` when opened directly.

Keeping navigation and approval actions on `/clawguard*` makes the browser path more coherent: users stay on the public shell surface, and tokenized shell entry URLs remain viable across the whole flow instead of only the first page load.

## Demo posture / limitations

This still does not create a native OpenClaw left-nav `Security` tab, and it does not make raw `/plugins/clawguard/*` routes public. Those protected routes still require the gateway `Authorization` header and still return `401` when opened directly without it.

The stable claim for this round is narrower: a user can now enter through `/clawguard`, stay on `/clawguard*` during navigation and approvals, and avoid dropping back to the protected route surface during the normal browser flow.
