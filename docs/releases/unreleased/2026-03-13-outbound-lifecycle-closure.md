---
type: feature
scope: outbound
audience: developer
summary: Closed more of the alpha outbound lifecycle without changing the fake-only install-demo scope.
breaking: false
demo_ready: true
tests:
  - pnpm exec vitest run tests/integration/openclaw-clawguard-plugin.test.ts tests/integration/openclaw-clawguard-outbound-lifecycle.test.ts
  - pnpm typecheck
artifacts:
  - plugins/openclaw-clawguard/src/hooks/message-sent.ts
  - plugins/openclaw-clawguard/src/services/state.ts
  - plugins/openclaw-clawguard/src/routes/settings.ts
  - tests/integration/openclaw-clawguard-outbound-lifecycle.test.ts
  - src/types/openclaw-plugin-sdk-core.d.ts
---

## What changed

- Added host-level outbound result closure on `message_sent` so direct sends now land as fake-only `allowed` or `failed` audit outcomes after delivery attempts.
- Kept tool-level `message` / `sessions_send` approval ownership on the existing before/after tool hooks and added focused outbound lifecycle tests for approved retry closure.
- Updated install-demo wording so current limitations describe the host/tool boundary more accurately.

## Why it matters

- The alpha baseline now explains more of the outbound lifecycle without adding a second classifier or changing product scope.
- Direct host outbound is auditable on both the hard-block side and the post-delivery side, while tool-layer approvals stay separate.
- Tests now pin the expected blocked / pending approval / allowed / failed semantics for outbound paths.
