# ClawGuard for OpenClaw install demo

This directory contains the **ClawGuard for OpenClaw install demo**.

- It is **not a formal release**
- It is **not published to any registry**
- The package name `@clawguard/clawguard` is metadata only, aligned with the plugin manifest id, and still unpublished

> [!IMPORTANT]
> **Install demo only.**
> Use the local path install as the default path, treat the local tarball as optional local packaging only, and keep all public walkthroughs **fake-only**.

## Current coverage

This install demo currently covers:

- risky `exec`
- minimal outbound coverage
- minimal workspace mutation coverage for `write` / `edit` / `apply_patch` actions, with alpha-safe checks for key config files, repo automation metadata, obvious out-of-workspace writes, and a workspace-only `tool_result_persist` fallback for result closure; this is the current demo surface, not broad workspace coverage
- a plugin-owned dashboard and control surface whose browser-facing entry path is the `/clawguard*` public shell, backed by the protected `/plugins/clawguard/dashboard`, `/plugins/clawguard/checkup`, `/plugins/clawguard/approvals`, `/plugins/clawguard/audit`, and `/plugins/clawguard/settings` pages

Current limitation:

- host-level direct outbound cannot enter the pending approval loop, so `message_sending` stays on the hard-block path for both `approve_required` and `block` cases; `message_sent` only closes sends that were actually allowed to leave the host, while approval ownership stays on tool-level `message` / `sessions_send`
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

1. Get the official tokenized dashboard URL with `openclaw dashboard --no-open`
2. Open `http://127.0.0.1:18789/clawguard#token=<gateway-token>` directly, or take the official tokenized dashboard URL and replace its path with `/clawguard`
3. Navigate to `/clawguard/checkup`
4. Open `/clawguard/approvals`
5. Open `/clawguard/audit`
6. Open `/clawguard/settings`
7. Confirm the shell loads the protected ClawGuard pages and the dashboard/checkup show the same install-demo posture summary

If you are watching logs, the plugin also reports that the ClawGuard demo plugin loaded.

### Important note about Control UI navigation

Today, OpenClaw plugins can register HTTP routes, but the current plugin API does **not** provide a first-class way to add a new left-nav Control UI tab such as **Security**.

That means the current demo should be verified through the plugin-owned public shell:

- `/clawguard`
- `/clawguard/checkup`
- `/clawguard/approvals`
- `/clawguard/audit`
- `/clawguard/settings`

The current Alpha choice is to keep a plugin-owned dashboard instead of adding a stock or patched Control UI `Security` tab. Any future embedded experience still depends on upstream plugin-navigation support rather than a nav hack.

### Public shell entry path

Direct browser navigation to `/plugins/clawguard/*` still returns `401 Unauthorized` unless the request carries the gateway `Authorization` header. OpenClaw's current browser auth middleware does not read browser storage when you navigate directly to a plugin page.

ClawGuard now exposes a plugin-owned public shell at `/clawguard`:

1. Get the official tokenized dashboard URL with `openclaw dashboard --no-open`
2. Open that URL directly after replacing its path with `/clawguard`
3. Or open `/clawguard#token=<gateway-token>` directly on the same origin

The public shell reads the current tab token from the official tokenized dashboard flow and then loads the protected `/plugins/clawguard/*` pages behind the scenes. This keeps the plugin usable without patching OpenClaw core and without requiring a browser userscript.

Within the shell, ClawGuard now rewrites protected page links and approval form actions back onto the `/clawguard*` surface. That keeps same-tab navigation on the public shell, while approval submits still proxy back to the protected approvals action using the current tab gateway token instead of exposing live approval mutations directly on the public route family.

If you arrive at bare `/clawguard` from an already authenticated official dashboard tab, the shell now promotes the current tab gateway token into its own session-scoped shell token cache and continues to emit tokenized `/clawguard#token=...` links. This keeps copied links and new-tab shell links stable inside the same browser session without patching OpenClaw core.


### Legacy companion userscript

The companion userscript remains in the repo as a development fallback, but it is no longer the primary user entry path:

1. Install `plugins/openclaw-clawguard/companion/clawguard-control-ui.user.js` into Tampermonkey or another userscript runner
2. Open the OpenClaw Control UI with a valid gateway token
3. Use the floating `ClawGuard` launcher to open `Dashboard`, `Checkup`, `Approvals`, `Audit`, or `Settings`

## Smoke path

- `/clawguard`
- `/clawguard/checkup`
- `/clawguard/approvals`
- `/clawguard/audit`
- `/clawguard/settings`

## Operator runbook (public demo / local demo)

Use this as the short operator script for public demo recordings or local walkthroughs:

1. From the repo root, install with `openclaw plugins install .\plugins\openclaw-clawguard`
2. If you need a single local artifact, run `pnpm --dir plugins\openclaw-clawguard pack`, then install the generated local `.tgz`
3. Restart OpenClaw after install; only mention reload if your local setup already proves it works
4. Run `openclaw dashboard --no-open`, then replace the official tokenized dashboard URL path with `/clawguard`
5. Smoke the five routes in order through the public shell: `Dashboard` → `Checkup` → `Approvals` → `Audit` → `Settings`
6. Keep every scenario fake-only: no real dangerous execution, no real outbound verification, no claim of publish / GA / formal release

### 1-minute demo order

1. Open `/clawguard#token=<gateway-token>` and say this is an install demo only, unpublished, local-path-first plugin demo
2. Point to the recommended install command and optional local tarball path
3. Use the dashboard cards to point to `/clawguard/checkup`, `/clawguard/approvals`, `/clawguard/audit`, and `/clawguard/settings`
4. Run one fake-only risky `exec` example and show the approval / audit path
5. Close by saying workspace mutation currently means the same fake-only review surface for `write` / `edit` / `apply_patch` actions, now with small alpha-safe heuristics around key config files, repo automation metadata, and obvious workspace escapes

### 3-minute demo order

1. Install from the repo root with `openclaw plugins install .\plugins\openclaw-clawguard`
2. Optionally mention `pnpm --dir plugins\openclaw-clawguard pack` as the local tarball path only
3. Restart OpenClaw and open the public shell via `openclaw dashboard --no-open` -> replace path with `/clawguard`
4. Smoke `Dashboard`, `Checkup`, `Approvals`, `Audit`, and `Settings` through the public shell
5. Run a fake-only `exec` example and show the pending approval
6. Run a fake-only outbound example and explain that outbound coverage is still intentionally minimal
7. Run a fake-only workspace mutation example and explain that the current demo surface is the `write` / `edit` / `apply_patch` action set, with small alpha-safe heuristics for key config files, repo automation metadata, and obvious workspace escapes
8. Close with the reminder that this is demo-only, unpublished, and not proof of real dangerous execution or real outbound delivery

## Fake-only demo scenarios

All public or local walkthroughs below should stay **fake-only**:

- no real dangerous command execution,
- no real outbound delivery verification,
- no real payment / red-packet movement,
- no production-sensitive workspace changes.

### 1. Exec risk

Ask OpenClaw to run a clearly risky shell action. Expected result:

- ClawGuard blocks or queues the action for approval
- the dashboard highlights it and the approval appears on `/clawguard/approvals`
- after approval, retry once to continue the demo path

### 2. Outbound risk

Ask OpenClaw to send a risky outbound message. Expected result:

- tool-level outbound coverage remains minimal
- tool-level outbound can now explain both explicit targets and implicit session delivery routes, but this is still the current fake-only minimal review surface rather than full delivery governance
- direct host outbound matches currently rely on the `message_sending` hard-block path because host-level sends do not enter the pending approval loop
- the event should be visible through the demo pages and audit trail

### 3. Workspace mutation risk

Ask OpenClaw to perform a risky file change such as a suspicious `write`, `edit`, or `apply_patch`. This shared `workspace mutation` action surface is fake-only. Current alpha heuristics especially call out `.env`, `.git/hooks`, `.github/workflows`, key config files, and obvious workspace-escape paths. Expected result:

- ClawGuard creates a pending approval or block decision
- the action can be reviewed from `/clawguard` or `/clawguard/approvals`
- the result is captured in `/clawguard/audit`

## Current limitations

- install posture is demo-only and local-only
- recommended path is local path install from the repo root
- optional tarball flow is local-only and for demo packaging only
- no registry publish should be implied
- no real dangerous execution or real outbound verification should be implied
- outbound coverage is still intentionally minimal
- host-level direct outbound cannot enter the pending approval loop, so `message_sending` stays on the hard-block path for both `approve_required` and `block` cases; `message_sent` only closes sends that were actually allowed to leave the host, while approval ownership stays on tool-level `message` / `sessions_send`
- workspace mutation heuristics remain intentionally small and fake-only: they only add explainable checks for key config files, repo automation metadata, and obvious out-of-workspace writes
- the built-in Control UI sidebar is still core-owned and hard-coded; there is no official plugin API to register a left-nav `Security` tab yet
- direct browser navigation to `/plugins/clawguard/*` still returns `401 Unauthorized` without gateway auth headers
- the supported no-core-patch browser path is the public shell at `/clawguard`, opened from the official tokenized dashboard URL or directly as `/clawguard#token=<gateway-token>`
- any future `Security` entry in Control UI therefore likely means either a custom/patched Control UI build or a future upstream plugin-nav capability
