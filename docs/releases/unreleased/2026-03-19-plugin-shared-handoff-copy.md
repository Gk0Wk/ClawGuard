---
type: refactor
scope: plugin
audience: developer
summary: Consolidated dashboard and checkup handoff copy into shared control-surface helpers so live approvals and audit closure language stays aligned.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/routes/shared.ts
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - plugins/openclaw-clawguard/src/routes/checkup.ts
---

## What changed

- Moved the repeated lifecycle handoff copy for `dashboard` and `checkup` into shared route helpers.
- The pages still say the same thing at the user level, but they now reuse one shared source for the "live item -> Approvals / closed flow -> Audit" boundary.

## Why it matters

- This removes one more small drift point between plugin-owned control-surface pages.
- Later copy updates can now tighten the handoff language in one place instead of editing multiple pages separately.

## Demo posture / limitations

- This is a presentation-layer refactor only; it does not add new hooks, new runtime capture, or new operator actions.
- The install-demo posture stays the same: fake-only, unpublished, plugin-owned pages, with bounded approvals and audit replay only.
