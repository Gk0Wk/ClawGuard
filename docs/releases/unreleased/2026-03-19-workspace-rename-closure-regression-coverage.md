---
type: test
scope: workspace
audience: developer
summary: Add regression coverage for top-level workspace rename closure without status fields
breaking: false
demo_ready: true
tests:
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
  - pnpm typecheck
artifacts:
  - tests/integration/openclaw-clawguard-plugin.test.ts
  - docs/releases/unreleased/2026-03-19-workspace-rename-closure-regression-coverage.md
---

## What changed

Added plugin integration coverage for the narrow closure case where a structured workspace result carries only a top-level rename-like path pair and omits summary, status, and result paths. The new regression test exercises the `oldPath/newPath` variant and asserts that Audit still records `workspace result state=rename-like via renamed` with a readable `renamed=... -> ...` detail.

## Why it matters

This locks in the intended behavior for minimal structured workspace results and protects the early-return path in `summarizeStructuredToolResult()` from regressing back to `undefined` when only rename-like path-pair evidence is present.

## Demo posture / limitations

This is regression coverage only. It does not broaden workspace heuristics or change the existing conservative rule that incomplete or conflicting path-pair fields should fall back to the current closure behavior.
