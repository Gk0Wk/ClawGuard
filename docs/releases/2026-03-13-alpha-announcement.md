# ClawGuard Alpha Announcement

## TL;DR

ClawGuard now ships a validated **alpha** OpenClaw install demo baseline with a local install path, plugin-hosted operator pages, clearer demo messaging, and a verified smoke workflow.

## What changed

- The OpenClaw plugin baseline is now strong enough to demonstrate approvals, audit, settings, and the first minimum guarded flows.
- Install-demo messaging is now aligned across the root README, Chinese README, plugin README, package metadata, and settings surface.
- The current alpha baseline now passes both `pnpm typecheck` and `pnpm test`.
- A local tarball surface check was added so the optional `pnpm pack` path matches the documented package surface.

## Why this matters

- Newcomers can now understand what ClawGuard is, what works today, and how to try it locally without mistaking the demo for a formal release.
- The repository is now easier to demo, easier to validate, and easier to evolve with a clearer release-notes workflow.

## Try the demo

From repo root:

- `openclaw plugins install .\\plugins\\openclaw-clawguard`

Optional local tarball:

- `pnpm --dir plugins\\openclaw-clawguard pack`

After install, restart OpenClaw and follow the operator runbook in `plugins/openclaw-clawguard/README.md`.

## Scope reminder

- alpha only
- install demo only
- not published to registry
- not formal GA release
- fake-only demo flow

## What we are working on next

- Generate polished public/internal notes directly from `docs/releases/unreleased/` entries
- Expand outbound coverage beyond the current minimum lifecycle
- Expand workspace coverage beyond the current demo-stage action surface

## Feedback

Open an issue with:

1. What you tried
2. What you expected
3. What happened
4. Relevant logs/screenshots
