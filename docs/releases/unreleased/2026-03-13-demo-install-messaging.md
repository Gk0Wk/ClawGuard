---
type: docs
scope: demo
audience: public
summary: Finalized the install-demo messaging, root README guidance, and plugin README runbook for public-facing explanation.
breaking: false
demo_ready: true
tests:
  - pnpm test
artifacts:
  - README.md
  - README.zh-CN.md
  - plugins/openclaw-clawguard/README.md
  - plugins/openclaw-clawguard/src/routes/settings.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Rewrote the root English and Chinese READMEs to explain the current install-demo posture, public scope, and links to the plugin demo entry.
- Added a plugin-level README/runbook covering local-path install, optional local tarball flow, smoke paths, and demo limitations.
- Tightened settings-page install messaging and added tests for README/install-demo phrasing and package surface checks.

## Why it matters

- New visitors can now understand what ClawGuard is, what works today, and how to try the demo without mistaking it for a formal product release.
- The project now has a cleaner public-facing story for install, smoke verification, and demo boundaries.
- This reduced the risk of over-claiming what the demo currently covers.

## Demo posture / limitations

- What this update proves: ClawGuard now has a public-facing install-demo narrative with local install guidance, smoke paths, and clear operator-facing explanation.
- What this update does **not** prove: GA status, registry availability, or full runtime completeness across all OpenClaw risk surfaces.
- Any demo-only / unpublished reminder: this update explicitly reinforces that the current posture is install-demo only, local-first, and unpublished.
