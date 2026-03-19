---
type: fix
scope: outbound
audience: developer
summary: Surfaced route mode in host-level outbound audit closures so direct sends keep the same route semantics as approval-gated flows.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/services/state.ts
  - tests/integration/openclaw-clawguard-outbound-lifecycle.test.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Host-level `message_sending` audit details now include route mode in both the blocked path and the final allowed/failed closure path.
- The outbound lifecycle tests now assert that host outbound blocked, allowed, and failed entries all carry the same explicit route wording already used by approval-gated outbound flows.

## Why it matters

- This removes the last visible mismatch between host-level direct outbound and the rest of the outbound lifecycle presentation. The audit trail now reads consistently whether the send was blocked up front or closed after `message_sent`.
- Operators can see route mode in the host outbound audit trail without having to infer it from the surrounding implementation path.

## Demo posture / limitations

- This does not introduce retry/recovery, queue modeling, or new host outbound capabilities.
- It only sharpens the existing fake-only install-demo audit closure so the current route wording stays consistent across outbound surfaces.
