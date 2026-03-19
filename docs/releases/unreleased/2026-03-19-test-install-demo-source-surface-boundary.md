---
type: test
scope: plugin
audience: developer
summary: Fixed the install-demo source-surface assertion so it checks the checkout layout instead of requiring built dist artifacts up front.
breaking: false
demo_ready: true
tests:
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Tightened the install-demo metadata test so it checks the plugin source directory for `README.md`, `openclaw.plugin.json`, `package.json`, and `src`.
- Removed the incorrect assumption that `dist` must already exist before the dedicated build and tarball tests run.

## Why it matters

- CI can now distinguish between the source checkout layout and the later build/prepack artifact surface.
- This prevents false failures in the metadata test while preserving the stronger `dist` assertions in the dedicated build and tarball tests.

## Demo posture / limitations

- This is a test-boundary fix only. It does not change the plugin package contents or the install-demo workflow.
- The built `dist` surface is still verified later by the build and tarball integration tests.
