---
type: fix
scope: plugin
audience: public
summary: Switched the install-demo plugin to a self-contained built runtime so local OpenClaw installs no longer fail on `Cannot find module 'clawguard'`.
breaking: false
demo_ready: true
tests:
  - pnpm --dir plugins/openclaw-clawguard build
  - pnpm typecheck
  - pnpm test
  - openclaw plugins install .\plugins\openclaw-clawguard
artifacts:
  - plugins/openclaw-clawguard/package.json
  - plugins/openclaw-clawguard/dist/index.js
  - scripts/build-openclaw-clawguard-plugin.mjs
  - tests/integration/openclaw-clawguard-plugin.test.ts
  - tests/integration/openclaw-clawguard-tarball-surface.test.ts
---

## What changed

- Switched the OpenClaw install-demo plugin package from `src/index.ts` runtime entrypoints to a built `dist/index.js` runtime entry.
- Added a plugin build script that bundles the local ClawGuard runtime into the plugin artifact, instead of requiring an external `clawguard` package at install time.
- Updated package-surface and tarball tests to validate the built runtime artifact and added a self-contained import smoke check for the bundled plugin output.

## Why it matters

- The alpha install-demo promise now matches reality: `openclaw plugins install .\plugins\openclaw-clawguard` can install and load the plugin successfully.
- The plugin packaging now follows OpenClaw's documented guidance for standalone plugins: validate `openclaw.extensions` against built runtime files such as `dist/index.js`.
- This removes the most visible install blocker without changing the demo's fake-only scope or its current alpha posture.

## Demo posture / limitations

- What this update proves: the local alpha install-demo can now be copied into OpenClaw's extension directory and loaded successfully from a self-contained built runtime.
- What this update does **not** prove: registry publish, GA status, or that the plugin packaging is finalized for long-term public distribution.
- Any demo-only / unpublished reminder: this remains an unpublished alpha install-demo, even though its local install path is now actually runnable.
