---
type: fix
scope: outbound
audience: developer
summary: Clarified the control-surface handoff between tool-level outbound approvals and host-level direct outbound.
breaking: false
demo_ready: true
tests:
  - pnpm vitest run tests/integration/openclaw-clawguard-plugin.test.ts
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/routes/shared.ts
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - plugins/openclaw-clawguard/src/routes/checkup.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added a dedicated outbound handoff section on the dashboard and checkup routes so operators can read the two outbound lanes separately.
- Tightened the shared outbound copy to distinguish tool-level approvals (`message` / `sessions_send`) from host-level direct outbound (`message_sending`).
- Updated the integration test expectations so the route text, install-demo metadata, and outbound handoff wording stay aligned.

## Why it matters

- The operator surface now says the same thing in three places: tool-level outbound can create a live approval item, while host-level direct outbound never enters the pending queue and is only explained in Audit after a send blocks or completes.
- This reduces ambiguity in the dashboard/checkup handoff without changing any decision logic, schema, or hook behavior.

## Demo posture / limitations

- This is presentation-only. It does not add new outbound capability, retry/recovery handling, or queue modeling.
- The project remains Alpha, install-demo only, unpublished, and fake-only.
