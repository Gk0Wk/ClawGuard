# ClawGuard First Usable Version Draft (Public)

> Status: install-demo alpha draft
> Date: 2026-03-14
> Posture: **install-demo only / unpublished / fake-only**

## Summary

This first usable version is a **small, local OpenClaw install demo package**.

It gives new users one honest path to try ClawGuard today:

- install the plugin locally,
- restart OpenClaw,
- open the plugin-owned public shell entry and move through dashboard / checkup / approvals / audit / settings,
- and walk through a few **fake-only** approval and audit scenarios.

## What users can do today

- Install from the repo root with:
  - `openclaw plugins install .\plugins\openclaw-clawguard`
- Optionally build one **local-only** tarball for demo packaging:
  - `pnpm --dir plugins\openclaw-clawguard pack`
- Restart OpenClaw and enter through the public shell:
  - run `openclaw dashboard --no-open`
  - replace the official tokenized dashboard URL path with `/clawguard`
  - or open `/clawguard#token=<gateway-token>` directly on the same origin
- Smoke:
  - `/clawguard`
  - `/clawguard/checkup`
  - `/clawguard/approvals`
  - `/clawguard/audit`
  - `/clawguard/settings`
- Run a narrow demo surface across:
  - risky `exec`
  - minimal outbound review points, where host-level direct sends stay on the hard-block path and tool-level approvals remain on `message` / `sessions_send`
  - workspace mutation actions currently limited to `write` / `edit` / `apply_patch`

## Recommended smoke path

1. Run `openclaw dashboard --no-open`
2. Replace the official tokenized dashboard URL path with `/clawguard`
3. Open `/clawguard/checkup`
4. Open `/clawguard/approvals`
5. Open `/clawguard/audit`
6. Open `/clawguard/settings`
7. Run one fake-only risky `exec` example
8. If needed, add one fake-only outbound example and one fake-only workspace mutation example

## Recommended demo order

### 1-minute order

1. Say clearly: **install-demo only, unpublished, fake-only**
2. Show the local install command
3. Smoke dashboard → checkup → approvals → audit → settings
4. Run one fake-only risky `exec` example

### 3-minute order

1. Install locally from repo root
2. Restart OpenClaw
3. Smoke dashboard → checkup → approvals → audit → settings
4. Show one fake-only `exec` example
5. Show one fake-only outbound example
6. Show one fake-only workspace mutation example
7. Close with the scope reminder below

## What this version proves

- ClawGuard has a **usable local OpenClaw plugin install path**
- The plugin can serve its own protected operator pages under `/plugins/clawguard/*`, with `/clawguard*` as the supported browser-facing entry path
- The current approval + audit loop is understandable enough for a first install demo
- The current demo surface can explain a narrow set of fake-only flows across `exec`, outbound, and workspace mutation actions
- The current repository validation baseline is green:
  - `pnpm typecheck`
  - `pnpm test`

## What this version does **not** prove

- It does **not** mean the plugin is published to any registry
- It does **not** mean ClawGuard is GA or a mature release
- It does **not** prove real dangerous execution in a real environment
- It does **not** prove real money movement, red-packet execution, or payment handling
- It does **not** prove real outbound delivery verification
- It does **not** prove host-level approvals or complete outbound lifecycle coverage
- It does **not** prove broad workspace or host-hook coverage beyond the current `write` / `edit` / `apply_patch` demo surface
- It does **not** include a native OpenClaw Control UI left-nav `Security` tab

## Scope reminder

Please read this first usable version as:

- **install-demo only**
- **local-path-first**
- **optional local tarball only**
- **unpublished**
- **fake-only**

Anything beyond that belongs to later versions, not this draft.
