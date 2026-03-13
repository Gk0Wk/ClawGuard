# ClawGuard Alpha Release Notes (Internal)

> Version: alpha
> Date: 2026-03-13

## Feature

- Established the first hardened OpenClaw plugin baseline with approvals, audit, settings, persisted live state, and shared classifier integration.
- Added the workspace-mutation audit loop for pending approval, allow-once retry, and final post-execution outcomes.
- Added install-demo package metadata plus host-level outbound hard block coverage through `message_sending`.
- Added operator-facing runbook coverage and local tarball surface checks.

## Fix

- Restored `pnpm typecheck` by removing the unstable `openclaw/plugin-sdk/core` path alias coupling into vendored OpenClaw sources.
- Tightened strict-mode typing and safer runtime import patterns where needed.
- Aligned install-demo package, manifest, settings, and README posture around local-only unpublished alpha use.

## Docs

- Rewrote root English and Chinese README messaging to explain the install-demo state more honestly.
- Added plugin-level install-demo README with operator runbook, smoke paths, and fake-only demo boundaries.
- Added public/internal release templates and changeset documentation scaffolding.
- Synced `TODO.md` to reflect the recovered validation baseline and the current remaining follow-ups.

## Refactor

- Normalized workspace mutation wording and action-surface explanation across demo surfaces.
- Reduced typecheck coupling to vendored OpenClaw code.

## Test / CI

- Added baseline GitHub Actions CI for `pnpm typecheck` and `pnpm test`.
- Added `tests/integration/openclaw-clawguard-tarball-surface.test.ts`.
- Current verified local status:
  - `pnpm typecheck`: pass
  - `pnpm test`: pass

## Breaking changes

- None.

## Artifacts changed

- `README.md`
- `README.zh-CN.md`
- `plugins/openclaw-clawguard/README.md`
- `plugins/openclaw-clawguard/src/routes/settings.ts`
- `plugins/openclaw-clawguard/src/services/state.ts`
- `tests/integration/openclaw-clawguard-tarball-surface.test.ts`
- `.github/workflows/ci.yml`
- `docs/releases/unreleased/*.md`

## Validation

- `pnpm typecheck`: pass
- `pnpm test`: pass

## Follow-ups

- Generate the next public/internal release notes and announcement from accumulated unreleased entries.
- Expand outbound lifecycle coverage beyond the current host `message_sending` hard block.
- Expand workspace coverage beyond the current `write` / `edit` / `apply_patch` demo surface.
