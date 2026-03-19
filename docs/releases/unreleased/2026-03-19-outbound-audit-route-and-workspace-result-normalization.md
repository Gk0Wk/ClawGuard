---
type: feature
scope: plugin
audience: developer
summary: Clarify outbound audit routes and normalize workspace result-state synonyms
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test -- --run tests/integration/openclaw-clawguard-outbound-lifecycle.test.ts tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - plugins/openclaw-clawguard/src/services/state.ts
  - tests/integration/openclaw-clawguard-outbound-lifecycle.test.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
  - TODO.md
---

## What changed

ClawGuard now keeps outbound destination wording in the final audit detail for both tool-level outbound replays and host-level `message_sending` outcomes. The same round also normalizes workspace result-state synonyms such as `created`, `updated`, `deleted`, `renamed`, `create`, `update`, and `rename` back into the shared `insert` / `modify` / `delete` / `rename-like` labels during structured result summarization.

## Why it matters

This keeps the audit trail easier to read without widening the Alpha host surface. Operators can now see both the outbound route target and route mode in the final replay, while workspace result closure stays aligned with the same state vocabulary already used in approvals, summaries, and audit titles.

## Demo posture / limitations

This does not add new hooks, retries, delivery queues, or broader workspace capture. The outbound change is presentation-only on top of the existing normalized destination context, and the workspace change only affects result-summary wording after a flow already completed.
