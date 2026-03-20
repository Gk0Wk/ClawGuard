# ClawGuard First Usable Version Draft (Internal)

> Status: install-demo alpha draft
> Date: 2026-03-14
> Posture: **install-demo only / unpublished / fake-only**

## Release frame

This draft converges the current install-demo baseline into a **first usable version** package for communication purposes.

It does **not** broaden runtime scope. It packages the current codebase and unreleased changes into one modest boundary that is easier to explain externally.

## Included in the first usable version

### Runtime / operator surface

- OpenClaw native plugin install from local repo path
- Optional local tarball path for demo packaging only
- Plugin-owned public shell browser path:
  - `/clawguard`
  - `/clawguard/checkup`
  - `/clawguard/approvals`
  - `/clawguard/audit`
  - `/clawguard/settings`
- Protected backing routes remain under `/plugins/clawguard/*`
- Pending-action + allow-once-retry approval loop
- Audit closure for the current demo flows

### Current demo coverage

- risky `exec`
- minimal outbound review points:
  - tool-level `message` / `sessions_send` approval ownership
  - host-level `message_sending` hard block for both `approve_required` and `block` outcomes
  - `message_sent` result closure only for sends that were actually allowed to leave the host
- minimal workspace mutation demo surface:
  - `write`
  - `edit`
  - `apply_patch`
  - small alpha-safe heuristics around key config files, repo automation metadata, and obvious workspace escapes

### Docs / operator readiness

- root README and Chinese README aligned to install-demo posture
- plugin README runbook with local path install, local tarball option, smoke path, and demo order
- first usable version public draft
- first usable version internal draft
- first usable version announcement draft
- small first usable version acceptance checklist

## Recommended operator path

### Install

- Recommended: `openclaw plugins install .\plugins\openclaw-clawguard`
- Optional local packaging only: `pnpm --dir plugins\openclaw-clawguard pack`

### Smoke

1. Restart OpenClaw
2. Run `openclaw dashboard --no-open`
3. Replace the official tokenized dashboard URL path with `/clawguard`
4. Open `/clawguard/checkup`
5. Open `/clawguard/approvals`
6. Open `/clawguard/audit`
7. Open `/clawguard/settings`

### Demo order

1. State the posture first: install-demo only / unpublished / fake-only
2. Show the install command
3. Smoke the five plugin-owned routes in dashboard-first order
4. Demo fake-only `exec`
5. If time allows, add fake-only outbound
6. If time still allows, add fake-only workspace mutation

## What this version proves

- We have a repeatable local install story for the OpenClaw plugin baseline
- We have a stable operator smoke path on the plugin-owned public shell surface, backed by protected plugin routes
- We can explain the current approval / audit loop without implying nonexistent resume or embedded Control UI features
- We can truthfully describe the current scope without implying publish, GA, or broad runtime completeness
- Current local validation baseline remains:
  - `pnpm typecheck`
  - `pnpm test`

## What this version does **not** include

- registry publish
- GA / formal release claims
- real dangerous execution
- real payment or red-packet execution
- real outbound delivery proof
- host-level approvals or complete outbound lifecycle coverage
- complete workspace coverage
- native OpenClaw Control UI `Security` nav integration
- patched UI work, dashboard work, or new host-hook expansion

## Wording guardrails

- Say **first usable version** or **install-demo alpha**, not GA
- Say **fake-only** whenever demo scenarios are mentioned
- Say **minimal outbound review points**, not host-level approvals or complete outbound lifecycle
- Say **workspace mutation demo surface currently means `write` / `edit` / `apply_patch`**, not broad workspace governance
- Say **public shell entry path `/clawguard*` backed by protected plugin routes**, not embedded Control UI

## Validation

- `pnpm typecheck`
- `pnpm test`

## Suggested next step after this closure

- Review these drafts before any public post
- Keep future outbound / workspace / UI expansion explicitly out of this release frame
