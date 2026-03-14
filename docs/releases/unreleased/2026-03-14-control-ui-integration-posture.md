---
type: docs
scope: plugin
audience: developer
summary: Documented the current Control UI integration boundary: plugin-owned pages are supported, but a first-class `Security` nav tab still requires a patched UI or future upstream plugin-nav API.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - README.md
  - plugins/openclaw-clawguard/README.md
  - TODO.md
---

## What changed

- Documented that the current OpenClaw plugin API supports plugin-owned HTTP routes under `/plugins/clawguard/*`, but does not expose a first-class way to register a new left-nav Control UI tab such as `Security`.
- Clarified the current verification path for the install demo: directly open `/plugins/clawguard/settings`, `/plugins/clawguard/approvals`, and `/plugins/clawguard/audit` after install and restart.
- Captured the future options explicitly: keep growing plugin-owned pages, add a patched/custom Control UI nav link later, or wait for / contribute an upstream plugin-navigation API.

## Why it matters

- This prevents demo and product language from drifting into claims the current OpenClaw host surface does not support.
- It gives the team a clean, documented decision boundary: stay on the security runtime mainline now, and treat Control UI embedding as a separate integration track.
- It also keeps future Fleet or Copilot tasks grounded in a verified platform constraint instead of rediscovering the same limitation repeatedly.

## Demo posture / limitations

- What this update proves: the install-demo plugin can expose stable plugin-owned pages today.
- What this update does **not** prove: that ClawGuard already has a native embedded `Security` sidebar tab inside the stock OpenClaw Control UI.
- This remains an alpha demo posture note, not a claim of upstream UI platform support.
