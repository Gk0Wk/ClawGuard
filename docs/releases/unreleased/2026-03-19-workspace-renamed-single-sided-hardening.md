---
type: fix
scope: workspace
audience: developer
summary: Require complete path pairs before structured renamed results can surface rename-like closure detail.
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

The workspace result summarizer now treats `renamed` as a strict path-pair field. Structured `renamed` objects and array entries are only preserved when they contain a complete, non-no-op pair such as `fromPath/toPath`, `oldPath/newPath`, or `sourcePath/targetPath`.

## Why it matters

Previously, the generic structured-entry parser would accept a single-sided `renamed` path and let it surface as rename-like closure detail. That could incorrectly imply a move happened when the result only exposed one side of the path.

## Demo posture / limitations

This is a conservative hardening change limited to workspace result closure formatting. `created`, `updated`, and `deleted` keep their existing readable-path behavior, and top-level rename pairs continue to use the existing conflict and no-op safeguards.
