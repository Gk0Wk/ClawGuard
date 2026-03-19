---
type: fix
scope: plugin
audience: developer
summary: Made the dashboard and checkup approval-queue summaries show action titles and short outbound route hints instead of only tool names and reason text.
breaking: false
demo_ready: true
tests:
  - pnpm vitest run tests/integration/openclaw-clawguard-plugin.test.ts
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Dashboard pending approvals now render the captured action title as the primary label, with a short outbound route hint when one exists.
- The checkup approval-queue summary now reuses the same pending-action preview so the operator can scan the title and route hint without opening Approvals first.
- The integration test now pins the new title-and-route wording in both the HTML pages and the dashboard payload expectations.

## Why it matters

- Operators can now tell at a glance what the queue is waiting on instead of decoding only `tool_name + reason_summary`.
- Outbound pending actions become easier to triage because the queue preview surfaces route mode or route target without shifting the decision logic or audit flow.

## Demo posture / limitations

- This is presentation-only. It does not change pending action creation, state schema, route matching, or approval behavior.
- The project remains Alpha, install-demo only, unpublished, and fake-only.
