---
type: fix
scope: plugin
audience: developer
summary: Align the install-demo package name with the plugin manifest id to remove OpenClaw id-hint mismatch warnings.
breaking: false
demo_ready: true
tests:
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts tests/integration/openclaw-clawguard-tarball-surface.test.ts
  - pnpm typecheck
artifacts:
  - plugins/openclaw-clawguard/package.json
  - plugins/openclaw-clawguard/src/routes/shared.ts
  - plugins/openclaw-clawguard/README.md
  - tests/integration/openclaw-clawguard-plugin.test.ts
  - tests/integration/openclaw-clawguard-tarball-surface.test.ts
---

## What changed

The install-demo plugin package name now uses `@clawguard/clawguard` so OpenClaw's package-derived id hint matches the manifest id `clawguard`. Shared install-demo copy, the plugin README, and the package-surface tests were updated to reflect the aligned metadata.

## Why it matters

OpenClaw derives a candidate plugin id from the package name when loading extension packages. The previous unpublished placeholder name `@clawguard/openclaw-clawguard` caused a persistent runtime warning even though the plugin itself loaded correctly. Aligning the package name removes that false mismatch and makes local installs cleaner to operate.

## Demo posture / limitations

This does not create a published npm package and does not change the recommended install flow. The install-demo remains local-path-first, fake-only, and unpublished; this change only removes misleading loader diagnostics.
