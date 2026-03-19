---
type: refactor
scope: plugin
audience: developer
summary: Made outbound approval entries show the captured route as a dedicated presentation field instead of leaving it buried in the action title or impact scope.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - plugins/openclaw-clawguard/src/routes/approvals.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added a presentation-only outbound route summary to the Approvals page for `message` and `sessions_send` pending actions.
- The route is derived from the already captured tool parameters, so the page can show a dedicated `Outbound route:` line alongside the existing title, reason, and impact scope.
- Extended the outbound approvals integration test to assert that the explicit route is visible in the HTML output.

## Why it matters

- Operators can now see the actual outbound target directly in Approvals instead of reverse-reading it from a title or impact scope string.
- This makes outbound review clearer without changing approval ownership, route capture, or any runtime behavior.

## Demo posture / limitations

- This remains presentation-only. It does not alter the approval state machine, hook behavior, or payload schema.
- The new display only appears when the route can be read from the captured outbound tool parameters; ambiguous entries keep the existing conservative layout.
