---
type: fix
scope: workspace
audience: developer
summary: Preserve sourcePath and targetPath workspace result pairs in final audit closure summaries.
breaking: false
demo_ready: true
tests:
  - pnpm test -- tests/integration/openclaw-clawguard-plugin.test.ts
  - pnpm typecheck
artifacts:
  - plugins/openclaw-clawguard/src/services/state.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

The plugin workspace-result summarizer now recognizes `sourcePath` / `targetPath` as another conservative top-level rename pair shape, and it also accepts the same keys inside structured `renamed` entries. These aliases are folded into the existing rename-like closure summary path instead of being dropped.

## Why it matters

Some structured tool results naturally describe file moves with `sourcePath` and `targetPath` rather than `fromPath` / `toPath` or `oldPath` / `newPath`. Preserving those pairs keeps final workspace audit detail readable without widening the summary to ambiguous generic fields.

## Demo posture / limitations

This change only extends workspace result closure formatting. It does not change routing, approval semantics, or path heuristics, and it still requires a complete two-sided path pair before surfacing rename-like result detail.
