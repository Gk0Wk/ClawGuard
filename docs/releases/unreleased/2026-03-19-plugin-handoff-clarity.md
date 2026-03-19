---
type: docs
scope: plugin
audience: developer
summary: Clarify dashboard and checkup handoff language so live approvals point to Approvals and closed flows point to Audit.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - plugins/openclaw-clawguard/src/routes/checkup.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- The dashboard copy now tells operators to use Approvals for live items that still need a decision or retry, and Audit for the final closure after the item leaves the queue.
- The checkup copy now spells out the same split from the posture side: Approvals handles still-live items, and Audit is for the closed replay trail.

## Why it matters

- The control surface now separates action from closure more explicitly without changing any route structure or runtime behavior.
- This keeps the install-demo flow easier to read when an operator is moving from the summary view into either a live decision or a completed replay.

## Demo posture / limitations

- This only changes page wording and test expectations.
- It does not add new pages, new hooks, or new runtime semantics.
- The demo remains install-demo only, unpublished, and fake-only.
