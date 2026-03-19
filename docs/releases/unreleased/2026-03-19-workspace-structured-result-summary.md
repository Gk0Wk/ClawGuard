---
type: refactor
scope: workspace
audience: internal
summary: Surface structured workspace result details in audit closure
breaking: false
demo_ready: true
tests:
  - pnpm test -- tests/integration/openclaw-adapter-pipeline.test.ts
  - pnpm typecheck
artifacts:
  - plugins/openclaw-clawguard/src/services/state.ts
  - tests/integration/openclaw-adapter-pipeline.test.ts
---

## What changed

ClawGuard now summarizes structured workspace result payloads more consistently when a tool result closes the workspace path. The summary helper preserves host-provided `summary`, `message`, or `result` text, and it can also append optional `operationType`, `status`, and path data when the host only provides structured fields.

## Why it matters

Workspace closure now carries more of the host result surface into audit detail without changing the approval contract or the workspace risk decision itself. That makes the final audit trail easier to read when operators need to understand what finished, which paths were involved, and which operation semantics were resolved.

## Demo posture / limitations

This only improves the structured result text that appears after a workspace action closes. It does not change outbound handling, approval policy, or the underlying workspace decision model. If the host does not provide structured result metadata, ClawGuard still falls back to the existing conservative summary path.
