---
type: fix
scope: outbound
audience: developer
summary: Consistently surfaced explicit versus implicit outbound route mode across approval titles, risk summaries, and audit replay cards.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm vitest run tests/integration/openclaw-adapter-pipeline.test.ts tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - src/orchestration/classifier/evaluation-presentation.ts
  - plugins/openclaw-clawguard/src/routes/audit.ts
  - tests/integration/openclaw-adapter-pipeline.test.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Outbound approvals now label both route kinds explicitly, using `Approve outbound delivery (explicit route)` for explicit targets and `Approve outbound delivery (implicit route)` when session delivery context supplies the route.
- Outbound risk summaries and explanations now carry the same route-mode wording, so the approval trail and the replay trail describe the same route semantics.
- The Audit page now derives and renders route mode from recorded outbound details, so route mode is visible in the replay cards instead of only in deeper Core artifacts.

## Why it matters

- Operators no longer have to infer route semantics from a mix of title, explanation, and hidden context. The route mode is now obvious at the approval boundary and remains readable in the audit replay.
- This keeps the outbound lifecycle presentation aligned across Core output, Approvals, and Audit without changing the underlying decision model or adding a new queue state.

## Demo posture / limitations

- What this proves: the current Alpha install-demo can express explicit versus implicit outbound routing consistently in the existing operator surfaces.
- What this does **not** prove: retry/recovery queue modeling, richer delivery telemetry, or production outbound governance.
- Any demo-only / unpublished reminder: the project remains Alpha, install-demo only, unpublished, and fake-only.
