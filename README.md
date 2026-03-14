# ClawGuard

<p align="center">
   <img src="./assets/hero-banner-en.png" alt="ClawGuard hero banner" width="100%" />
</p>

<p align="center">
   <strong>The antivirus for OpenClaw.</strong><br />
   Blocks dangerous actions, scans skills, stops secret leaks, and puts humans back in control.
</p>

<p align="center">
   <a href="./README.zh-CN.md">简体中文</a> ·
   <a href="#what-it-is">What it is</a> ·
   <a href="#what-works-today">What works today</a> ·
   <a href="#install-demo">Install demo</a> ·
   <a href="#demo-scenarios">Demo scenarios</a> ·
   <a href="#current-limitations">Current limitations</a> ·
   <a href="#docs-map">Docs map</a>
</p>

<p align="center">
   <img alt="protect money" src="https://img.shields.io/badge/protect-money-0ea5e9?style=for-the-badge" />
   <img alt="scan skills" src="https://img.shields.io/badge/scan-skills-8b5cf6?style=for-the-badge" />
   <img alt="stop leaks" src="https://img.shields.io/badge/stop-secret%20leaks-f43f5e?style=for-the-badge" />
   <img alt="human approval" src="https://img.shields.io/badge/human-final%20vote-22c55e?style=for-the-badge" />
</p>

## What it is

`ClawGuard` is the **security control layer for OpenClaw**.

If you are landing on this repository for the first time, the short version is:

> **ClawGuard is The antivirus for OpenClaw.**

It is designed to sit between OpenClaw and high-risk actions so users can:

- require human approval before risky actions continue,
- inspect and explain risky behavior,
- keep an audit trail,
- and gradually add protection across exec, outbound, and workspace-mutation paths.

## What works today

There is now a **first OpenClaw install demo** in this repository.

Today that demo covers:

- **risky `exec`**
- **minimal outbound coverage**
- **minimal workspace mutation coverage for `write` / `edit` / `apply_patch` actions**
- **plugin-hosted approvals, audit, and settings pages** at:
  - `/plugins/clawguard/settings`
  - `/plugins/clawguard/approvals`
  - `/plugins/clawguard/audit`

Current Control UI posture:

- the plugin can already expose its own HTTP surfaces under `/plugins/clawguard/*`,
- but the current OpenClaw plugin API does **not** expose a formal way to register a left-nav tab such as **Security** inside the built-in Control UI,
- so the current demo should be understood as **plugin-owned pages reachable from direct URLs**, not a first-class embedded dashboard tab yet.

Current repo status:

- the repo is still in a **docs-first + Sprint 0 code-bootstrap stage**,
- the installable OpenClaw path is currently a **demo baseline**, not a product release,
- and the demo is meant to show the first host integration and review flow, not a finished security platform.

## Install demo

The install-demo entry lives here:

- [`plugins/openclaw-clawguard/README.md`](./plugins/openclaw-clawguard/README.md)

Recommended install method from the repo root:

```powershell
openclaw plugins install .\plugins\openclaw-clawguard
```

Optional local tarball demo only:

```powershell
pnpm --dir plugins\openclaw-clawguard pack
openclaw plugins install .\plugins\openclaw-clawguard\<generated-tarball>.tgz
```

Important posture:

- this is an **install demo only**,
- it is **not published to a registry**,
- `@clawguard/openclaw-clawguard` is currently **metadata / future-compatibility naming only**,
- and this README does **not** imply npm publish, GA, or a formal release.

After install, restart OpenClaw, then use the plugin README operator runbook for the smoke path, 1-minute demo order, and 3-minute demo order.

## Demo scenarios

The current public-demo-ready scenarios are intentionally narrow:

1. **Risky exec**
   - ClawGuard blocks or queues a risky action for approval.
   - The decision is visible in the approvals page and the result lands in audit.
2. **Minimal outbound**
   - The demo shows the first outbound review / block posture.
   - Host-level outbound coverage is still intentionally limited.
3. **Minimal workspace mutation**
   - Risky file-change flows can enter the same approval / audit path.
   - In the current demo surface, `write` / `edit` / `apply_patch` are all explained as workspace mutation actions.
4. **Plugin-hosted operator flow**
   - Settings, approvals, and audit pages provide the current demo surface.

For storytelling, the north-star scenario remains:

> **A group message tries to make OpenClaw send money, and ClawGuard puts the final decision back in human hands.**

But the repository demo should currently be understood as a **local install + page smoke + fake-only safety flow**, not as proof of real payment execution, real money movement, or broad runtime completeness.

## Current limitations

Please read this repo with the current scope in mind:

- **install demo only**
- **local path install is the recommended path**
- **local tarball is optional and local-only**
- **not published**
- **not a formal release**
- **not presented as GA or a complete product**
- **outbound coverage is still minimal**
- **host-level outbound keeps hard blocks on `message_sending` and closes allowed / failed delivery on `message_sent`, while tool-level approvals stay on `message` / `sessions_send`**
- **the approval loop is still a pending-action + allow-once-retry demo flow**
- **the built-in Control UI sidebar is currently core-owned and hard-coded; there is no official plugin nav registration API for a `Security` tab yet**
- **current UI integration therefore relies on direct plugin routes such as `/plugins/clawguard/settings`, `/plugins/clawguard/approvals`, and `/plugins/clawguard/audit`**
- **future embedded Control UI options likely mean either (a) a plugin-owned `/plugins/clawguard/dashboard` route plus a custom/patched Control UI nav item, or (b) an upstream OpenClaw plugin-nav API that does not exist today**
- **the demo should not be read as real dangerous execution, real transfer / red-packet execution, or full release-grade validation**

## Docs map

### Start here

- [`plugins/openclaw-clawguard/README.md`](./plugins/openclaw-clawguard/README.md) — install-demo entry, operator runbook, local path install, optional local tarball, smoke path, 1-minute / 3-minute demo order
- [`docs/v1-installer-demo-strategy.md`](./docs/v1-installer-demo-strategy.md) — install-demo posture and why the current path is plugin-first, local-only, and not published
- [`docs/v1-north-star-demo-script.md`](./docs/v1-north-star-demo-script.md) — the flagship “group message tries to make OpenClaw send money” demo narrative

### Product and implementation context

- [`docs/system-architecture.md`](./docs/system-architecture.md) — long-term platform architecture
- [`docs/v1-implementation-breakdown.md`](./docs/v1-implementation-breakdown.md) — V1 slices and implementation order
- [`docs/v1-development-readiness-checklist.md`](./docs/v1-development-readiness-checklist.md) — what still needs tightening before broader development
- [`docs/security-methodology.md`](./docs/security-methodology.md) — ClawGuard defense model

### Positioning and launch context

- [`docs/star-strategy.md`](./docs/star-strategy.md) — GitHub-facing positioning and launch strategy
- [`README.zh-CN.md`](./README.zh-CN.md) — Simplified Chinese repository entry
- [`TODO.md`](./TODO.md) — current project decisions and next documentation / demo tightening items
