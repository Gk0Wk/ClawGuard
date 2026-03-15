---
type: test
scope: plugin
audience: developer
summary: Added repeatable FUV smoke coverage for the audit route and stabilized the install/tarball integration tests with shared build reuse plus explicit timeout budgets.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - tests/integration/openclaw-clawguard-plugin.test.ts
  - tests/integration/openclaw-clawguard-tarball-surface.test.ts
  - docs/releases/2026-03-14-first-usable-version-acceptance-checklist.md
---

## What changed

- Added HTTP-level smoke regression coverage for `/plugins/clawguard/audit` in the plugin integration suite so the three-route first-usable-version smoke path is fully covered.
- Reused the install-demo build output within the plugin integration suite instead of rebuilding the plugin multiple times in the same process.
- Added explicit timeout budgets to the build-heavy install/tarball tests to reduce timeout-driven baseline failures on slower environments.

## Why it matters

- The current first usable version is easier to re-accept and re-smoke because the documented route surface is now better protected by automated checks.
- Install/tarball verification stays honest while becoming less flaky under full-suite execution.

## Demo posture / limitations

- What this update proves: the current install-demo smoke path and package-surface checks are more repeatable in CI/local validation.
- What this update does **not** prove: any broader runtime coverage, publish readiness, or embedded Control UI support.
