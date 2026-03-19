---
type: feature
scope: runtime
audience: developer
summary: Surfaced structured workspace result detail in audit closure and promoted implicit outbound routing into the approval surface.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm exec vitest run tests/integration/openclaw-adapter-pipeline.test.ts tests/integration/openclaw-clawguard-plugin.test.ts
  - pnpm test
artifacts:
  - src/orchestration/classifier/evaluation-presentation.ts
  - plugins/openclaw-clawguard/src/services/state.ts
  - tests/integration/openclaw-adapter-pipeline.test.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
  - TODO.md
---

## What changed

- Updated outbound approval presentation so implicit session-routed delivery now shows up directly in the action title as `Approve outbound delivery (implicit route)`.
- Updated plugin-side post-execution closure so workspace audit entries can include a small amount of structured result detail from `tool_result_persist`, currently limited to conservative `status` and `paths` extraction.
- Added integration coverage for both behaviors: implicit outbound approval surfacing and workspace replay closure with structured persisted-result detail.

## Why it matters

- Operators no longer need to infer implicit routing only from deeper explanation text; the approval surface now signals that distinction immediately.
- Workspace replay closure is slightly more actionable because the audit trail can now preserve a minimal structured summary of what the host said it persisted, instead of collapsing everything down to a generic completion line.

## Demo posture / limitations

- What this proves: the current Alpha plugin can surface slightly richer lifecycle context without widening the underlying approval model or introducing new broad runtime capture.
- What this does **not** prove: full delivery lifecycle governance, rich result telemetry for every host tool, or production-grade mutation forensics.
- Any demo-only / unpublished reminder: the project remains Alpha, install-demo only, unpublished, and fake-only.
