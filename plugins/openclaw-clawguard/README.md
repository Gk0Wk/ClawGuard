# ClawGuard for OpenClaw install demo

This directory contains the **ClawGuard for OpenClaw install demo**.

- It is **not a formal release**
- It is **not published to any registry**
- The package name `@clawguard/openclaw-clawguard` is metadata only and a future-compatibility placeholder

> [!IMPORTANT]
> **Install demo only.**
> Use the local path install as the default path, treat the local tarball as optional local packaging only, and keep all public walkthroughs **fake-only**.

## Current coverage

This install demo currently covers:

- risky `exec`
- minimal outbound coverage
- minimal workspace mutation coverage for `write` / `edit` / `apply_patch` actions, with alpha-safe checks for key config files, repo automation metadata, and obvious out-of-workspace writes; this is the current demo surface, not broad workspace coverage
- a plugin-owned dashboard at `/plugins/clawguard/dashboard`, plus supporting `/plugins/clawguard/approvals`, `/plugins/clawguard/audit`, and `/plugins/clawguard/settings` pages

Current limitation:

- host-level outbound now keeps hard blocks on `message_sending` and closes allowed / failed delivery on `message_sent`, while approval ownership stays on tool-level `message` / `sessions_send`
- these outbound points are intentionally minimal and fake-only; they should not be described as complete outbound lifecycle coverage

## Recommended install method: local path from repo root

Run the install from the repository root:

```powershell
openclaw plugins install .\plugins\openclaw-clawguard
```

After install, restart OpenClaw (or reload the plugin host if your local dev setup already supports that). For this demo, **restart is the safe assumption**.

## Optional method: local tarball only

This is only for local demo packaging. It does **not** imply any registry publish.

From the repository root:

```powershell
pnpm --dir plugins\openclaw-clawguard pack
openclaw plugins install .\plugins\openclaw-clawguard\<generated-tarball>.tgz
```

Restart OpenClaw after installing the tarball as well.

## How to verify the plugin loaded

After install and restart:

1. Open `/plugins/clawguard/dashboard`
2. Open `/plugins/clawguard/approvals`
3. Open `/plugins/clawguard/audit`
4. Open `/plugins/clawguard/settings`
5. Confirm the dashboard shows the install-demo summary and the supporting routes return normally

If you are watching logs, the plugin also reports that the ClawGuard demo plugin loaded.

### Important note about Control UI navigation

Today, OpenClaw plugins can register HTTP routes, but the current plugin API does **not** provide a first-class way to add a new left-nav Control UI tab such as **Security**.

That means the current demo should be verified by opening the plugin-owned routes directly:

- `/plugins/clawguard/dashboard`
- `/plugins/clawguard/settings`
- `/plugins/clawguard/approvals`
- `/plugins/clawguard/audit`

The current Alpha choice is to keep a plugin-owned dashboard instead of adding a stock or patched Control UI `Security` tab. Any future embedded experience still depends on upstream plugin-navigation support rather than a nav hack.

## Smoke path

- `/plugins/clawguard/dashboard`
- `/plugins/clawguard/settings`
- `/plugins/clawguard/approvals`
- `/plugins/clawguard/audit`

## Operator runbook (public demo / local demo)

Use this as the short operator script for public demo recordings or local walkthroughs:

1. From the repo root, install with `openclaw plugins install .\plugins\openclaw-clawguard`
2. If you need a single local artifact, run `pnpm --dir plugins\openclaw-clawguard pack`, then install the generated local `.tgz`
3. Restart OpenClaw after install; only mention reload if your local setup already proves it works
4. Smoke the four routes in order: `/plugins/clawguard/dashboard` → `/plugins/clawguard/approvals` → `/plugins/clawguard/audit` → `/plugins/clawguard/settings`
5. Keep every scenario fake-only: no real dangerous execution, no real outbound verification, no claim of publish / GA / formal release

### 1-minute demo order

1. Open `/plugins/clawguard/dashboard` and say this is an install demo only, unpublished, local-path-first plugin demo
2. Point to the recommended install command and optional local tarball path
3. Use the dashboard cards to point to `/plugins/clawguard/approvals`, `/plugins/clawguard/audit`, and `/plugins/clawguard/settings`
4. Run one fake-only risky `exec` example and show the approval / audit path
5. Close by saying workspace mutation currently means the same fake-only review surface for `write` / `edit` / `apply_patch` actions, now with small alpha-safe heuristics around key config files, repo automation metadata, and obvious workspace escapes

### 3-minute demo order

1. Install from the repo root with `openclaw plugins install .\plugins\openclaw-clawguard`
2. Optionally mention `pnpm --dir plugins\openclaw-clawguard pack` as the local tarball path only
3. Restart OpenClaw and smoke `/plugins/clawguard/dashboard`, `/plugins/clawguard/approvals`, `/plugins/clawguard/audit`, and `/plugins/clawguard/settings`
4. Run a fake-only `exec` example and show the pending approval
5. Run a fake-only outbound example and explain that outbound coverage is still intentionally minimal
6. Run a fake-only workspace mutation example and explain that the current demo surface is the `write` / `edit` / `apply_patch` action set, with small alpha-safe heuristics for key config files, repo automation metadata, and obvious workspace escapes
7. Close with the reminder that this is demo-only, unpublished, and not proof of real dangerous execution or real outbound delivery

## Fake-only demo scenarios

All public or local walkthroughs below should stay **fake-only**:

- no real dangerous command execution,
- no real outbound delivery verification,
- no real payment / red-packet movement,
- no production-sensitive workspace changes.

### 1. Exec risk

Ask OpenClaw to run a clearly risky shell action. Expected result:

- ClawGuard blocks or queues the action for approval
- the dashboard highlights it and the approval appears on `/plugins/clawguard/approvals`
- after approval, retry once to continue the demo path

### 2. Outbound risk

Ask OpenClaw to send a risky outbound message. Expected result:

- tool-level outbound coverage remains minimal
- direct host outbound matches currently rely on the `message_sending` hard block path
- the event should be visible through the demo pages and audit trail

### 3. Workspace mutation risk

Ask OpenClaw to perform a risky file change such as a suspicious `write`, `edit`, or `apply_patch`. This shared `workspace mutation` action surface is fake-only. Current alpha heuristics especially call out `.env`, `.git/hooks`, `.github/workflows`, key config files, and obvious workspace-escape paths. Expected result:

- ClawGuard creates a pending approval or block decision
- the action can be reviewed from `/plugins/clawguard/dashboard` or `/plugins/clawguard/approvals`
- the result is captured in `/plugins/clawguard/audit`

## Current limitations

- install posture is demo-only and local-only
- recommended path is local path install from the repo root
- optional tarball flow is local-only and for demo packaging only
- no registry publish should be implied
- no real dangerous execution or real outbound verification should be implied
- outbound coverage is still intentionally minimal
- host-level outbound keeps hard blocks on `message_sending` and closes allowed / failed delivery on `message_sent`, while approval ownership stays on tool-level `message` / `sessions_send`
- workspace mutation heuristics remain intentionally small and fake-only: they only add explainable checks for key config files, repo automation metadata, and obvious out-of-workspace writes
- the built-in Control UI sidebar is still core-owned and hard-coded; there is no official plugin API to register a left-nav `Security` tab yet
- any future `Security` entry in Control UI therefore likely means either a custom/patched Control UI build or a future upstream plugin-nav capability
