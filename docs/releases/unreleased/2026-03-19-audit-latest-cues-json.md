---
type: refactor
scope: audit
audience: developer
summary: Added latest outbound route and workspace result state cues to the Audit JSON payload so the hero summary can be consumed programmatically.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - plugins/openclaw-clawguard/src/routes/audit.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added a `timeline.latest` payload section to the Audit JSON response.
- The new section exposes `latestOutboundRoute` and `latestWorkspaceResultState` when those cues already exist in the parsed replay data.
- The integration test now asserts the JSON payload matches the same latest cues that the HTML hero already shows.

## Why it matters

- Consumers of the JSON route now get the same top-level replay summary that the human-facing hero already shows.
- This keeps the Audit page consistent across HTML and JSON without changing state capture, audit persistence, or runtime behavior.

## Demo posture / limitations

- This is presentation-only data shaping. It does not add new hooks or new audit records.
- The `latest` section is omitted when there is no parsed latest cue to show; it never fabricates placeholder values.
