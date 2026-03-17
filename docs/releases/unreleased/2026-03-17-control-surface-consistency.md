---
type: feature
scope: plugin
audience: public
summary: Consolidated the current ClawGuard Alpha control surface into one dashboard-first, plugin-owned route set with shared posture/navigation cues and a clearer audit replay path.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - README.md
  - README.zh-CN.md
  - plugins/openclaw-clawguard/README.md
  - plugins/openclaw-clawguard/src/routes/shared.ts
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - plugins/openclaw-clawguard/src/routes/checkup.ts
  - plugins/openclaw-clawguard/src/routes/approvals.ts
  - plugins/openclaw-clawguard/src/routes/audit.ts
  - plugins/openclaw-clawguard/src/routes/settings.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Kept `/plugins/clawguard/dashboard` as the plugin-owned Alpha entry point for the current install-demo control surface.
- Kept `/plugins/clawguard/checkup`, `/plugins/clawguard/approvals`, `/plugins/clawguard/audit`, and `/plugins/clawguard/settings` inside the same five-route direct plugin surface instead of treating them as separate expansions.
- Added shared control-surface posture and navigation cues so the pages consistently explain the current role split: dashboard for status, checkup for explanation, approvals for action, audit for replay, and settings for limits.
- Reframed the audit page as a clearer replay/timeline over the existing audit trail without changing the underlying plugin-state boundary.

## Why it matters

- The current Alpha demo now reads as one dashboard-first control surface instead of a pile of route slices that could be double-counted in release notes.
- It is easier to explain how posture, approvals, audit history, and install-demo limits connect while keeping the facts scoped to the existing plugin-owned surface.

## Demo posture / limitations

- What this proves: ClawGuard currently owns a small plugin-hosted Alpha control surface for install-demo posture, approvals review, audit replay, and settings context.
- What this does **not** prove: a stock Control UI `Security` tab, published package status, non-demo runtime coverage, or broader protection than the existing fake-only plugin routes.
- Any demo-only / unpublished reminder: this remains install-demo only, unpublished, fake-only, and direct-route based.
