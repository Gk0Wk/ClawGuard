---
type: fix
scope: outbound
audience: developer
summary: Approvals now renders outbound route mode as a separate field for live pending actions by reusing the existing captured action text.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/routes/approvals.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added a small outbound-only parser in the Approvals page that reads route mode from existing pending-action text fields.
- Outbound pending actions now show `Route mode` as its own visible field instead of relying only on guidance or summary text.

## Why it matters

- Operators can now scan the live queue and distinguish explicit versus implicit outbound paths without parsing the longer guidance paragraph.
- The change is presentation-only and reuses already captured content, so it does not alter the runtime state schema or hook flow.

## Demo posture / limitations

- This does not add new outbound capabilities or new approval states.
- It only improves how the existing outbound pending action is explained in the install-demo UI.
