# ClawGuard Alpha Release Notes (Public)

> Version: alpha
> Date: 2026-03-13

## Highlights

- ClawGuard now has a runnable OpenClaw install demo baseline with a clearer local install path, operator runbook, and smoke verification flow.
- The demo now covers the current minimum review surface across risky `exec`, minimal outbound, and workspace mutation actions (`write` / `edit` / `apply_patch`).
- The repository now includes baseline CI and reusable release communication templates.

## What's new

- Added the first hardened OpenClaw plugin baseline with plugin-hosted approvals, audit, and settings pages.
- Added install-demo package metadata and the first host-level outbound hard block via `message_sending`.
- Finalized root README, Chinese README, and plugin README messaging so new visitors can understand what the demo is and how to try it locally.
- Added a local operator runbook with smoke paths plus 1-minute and 3-minute demo orders.
- Added a local tarball surface check to verify that `pnpm pack` matches the documented demo package surface.

## Fixes and improvements

- Restored `pnpm typecheck` to green by removing the unstable vendored OpenClaw alias coupling and tightening strict-mode typing where needed.
- Completed the workspace-mutation audit loop so the demo can explain approval intent and final execution outcomes together.
- Unified the external wording so workspace mutation consistently refers to the current `write` / `edit` / `apply_patch` action surface.

## Demo posture (important)

This update is currently:

- [x] install demo only
- [x] not published to registry
- [x] not a formal GA release

## What this update proves

- A newcomer can locally install the OpenClaw plugin demo, restart OpenClaw, and verify the demo surface through `/plugins/clawguard/settings`, `/plugins/clawguard/approvals`, and `/plugins/clawguard/audit`.
- The current alpha baseline is validated by both `pnpm typecheck` and `pnpm test`.
- The repo now has a stable public-facing explanation of what the demo covers and what it does not claim.

## What this update does NOT prove

- It does not imply npm / registry publish.
- It does not imply formal release, GA status, or a complete product rollout.
- It does not prove real dangerous execution, real payment flows, or real outbound delivery verification.
- It does not prove full outbound lifecycle coverage or full workspace host coverage.

## How to try it locally

- Recommended local path install:
  - `openclaw plugins install .\\plugins\\openclaw-clawguard`
- Optional local tarball path:
  - `pnpm --dir plugins\\openclaw-clawguard pack`

After install, restart OpenClaw and use the plugin README operator runbook for the smoke path and demo sequence.

## Verification

- Tests run:
  - `pnpm typecheck`
  - `pnpm test`
