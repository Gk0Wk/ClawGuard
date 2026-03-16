---
type: feature
scope: plugin
audience: public
summary: Added a plugin-owned dashboard route that summarizes the current install-demo posture, approvals, audit activity, and settings without expanding beyond existing fake-only capabilities.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - plugins/openclaw-clawguard/src/index.ts
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - plugins/openclaw-clawguard/src/routes/shared.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added the plugin-owned `/plugins/clawguard/dashboard` route as the current ClawGuard install-demo entry point.
- Kept the dashboard narrowly scoped to current real capabilities only: install-demo posture and scope reminders, a pending approvals overview, a recent audit summary, a current settings and limits summary with shared install-demo metadata, and next links into the existing approvals, audit, and settings pages.
- Reused the existing plugin route and state surfaces instead of introducing a new dashboard architecture: the page reads the shared install-demo metadata plus the current approvals, audit, and settings state that already powers the other plugin-owned routes.

## Why it matters

- The dashboard gives the install demo a single starting page without overstating product maturity or adding new behavior beyond the already-implemented fake-only surfaces.
- It makes the current state easier to verify in one place while preserving the existing architecture boundary: shared install-demo metadata, existing approvals and audit data, and the current settings/limits state remain the source of truth.
- It also keeps the integration story honest: this is still a plugin-owned route, not embedded stock Control UI navigation or a broader ClawGuard control plane.

## Demo posture / limitations

- What this update proves: ClawGuard now has a real plugin-owned dashboard route that aggregates current install-demo facts, pending approvals, recent audit activity, current settings/limits metadata, and next-step links.
- What this update does **not** prove: any embedded Control UI `Security` tab, any stock nav integration, any published package/release status, or any real-danger runtime beyond the current fake-only demo scope.
- Any demo-only / unpublished reminder: this remains install-demo only, unpublished, fake-only, and direct-route based.
