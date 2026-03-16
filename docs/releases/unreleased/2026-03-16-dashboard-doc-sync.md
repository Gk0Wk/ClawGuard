---
type: docs
scope: plugin
audience: developer
summary: Synced install-demo docs to the new plugin-owned dashboard route without changing the broader alpha posture.
breaking: false
demo_ready: true
tests:
  - pnpm test
artifacts:
  - TODO.md
  - docs/releases/unreleased/2026-03-16-dashboard-doc-sync.md
---

## What changed

- Updated `TODO.md` so the current first usable version smoke path now explicitly includes `/plugins/clawguard/dashboard` alongside `/plugins/clawguard/approvals`, `/plugins/clawguard/audit`, and `/plugins/clawguard/settings`.
- Replaced the stale TODO follow-up that framed the dashboard as a future option; the repo now treats it as the current plugin-owned Alpha entry point.
- Kept the wording narrow to install-demo sync only, rather than reopening broader blueprint, release, or announcement materials.

## Why it matters

- This removes the main remaining contradiction between the current implementation and the repo-level working notes.
- It keeps the dashboard visible as a real route while preserving the existing boundary that ClawGuard still does not own a stock Control UI `Security` tab.
- It records the doc sync as a small, explicit release-note-worthy update instead of letting it disappear into a broader docs cycle.

## Demo posture / limitations

- What this update proves: the install demo currently includes a plugin-owned `/plugins/clawguard/dashboard` route as an Alpha entry point.
- What this update does **not** prove: any publish/GA status, any real-danger execution, any real outbound verification, or any stock / patched Control UI `Security` navigation support.
- Any demo-only / unpublished reminder: keep the posture explicit as install-demo only, unpublished, fake-only, and direct-route based with no dashboard/nav hack.
