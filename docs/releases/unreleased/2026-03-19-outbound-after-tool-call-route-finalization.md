---
type: fix
scope: outbound
audience: developer
summary: Surfaced outbound route mode in after-tool-call final outcome details so approval-gated deliveries keep the same route semantics in their audit closure.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/services/state.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- The plugin's after-tool-call outbound finalization now records route mode in the final outcome detail when the outbound evaluation already knows the route.
- The outbound plugin integration test now exercises a full approval-gated `sessions_send` flow, approves it, and verifies that the allowed audit entry carries both the final outcome and the route-aware result detail.

## Why it matters

- This closes a small but visible gap in the outbound lifecycle: approval, replay, and final result now read like one continuous trail instead of three loosely related statements.
- Operators can see the route mode at the approval boundary and again at final closure without relying on hidden Core objects.

## Demo posture / limitations

- This does not add retry/recovery modeling, queue orchestration, or host-level outbound changes.
- It only enriches the existing fake-only install-demo audit closure for tool-level outbound flows that already carry route information.
