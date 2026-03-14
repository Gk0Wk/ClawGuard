---
type: fix
scope: runtime
audience: developer
summary: Tightened shared Core rename-like edit detection so only high-confidence identifier-family renames emit rename-like and short token swaps fall back to modify.
breaking: false
demo_ready: true
tests:
  - node .\node_modules\vitest\vitest.mjs run tests\unit\input-normalization.test.ts tests\integration\openclaw-adapter-pipeline.test.ts tests\integration\openclaw-clawguard-plugin.test.ts
  - pnpm typecheck
artifacts:
  - src/domain/context/evaluation-input.ts
  - tests/unit/input-normalization.test.ts
  - tests/integration/openclaw-adapter-pipeline.test.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Tightened shared Core `edit` workspace-mutation classification so `rename-like` is only emitted for high-confidence identifier-style renames in the same naming family.
- Limited rename-like detection to `camelCase`, `PascalCase`, `snake_case`, and `SCREAMING_SNAKE_CASE`, while rejecting lower-confidence literals, version-like values, numeric-only swaps, and short token replacements.
- Preserved the existing approval and audit text chain, but let it reflect the safer fallback to `modify` when the rename signal is weak.

## Why it matters

- Workspace mutation messaging is less misleading: value flips and short token edits no longer look like identifier refactors.
- Shared Core semantics stay additive through optional `workspace_context.operation_type` without changing routing behavior.
- Plugin and adapter surfaces stay aligned because both read the same Core operation-type signal.

## Demo posture / limitations

- What this update proves: the shared Core can conservatively distinguish identifier-family renames from lower-confidence text replacements.
- What this update does **not** prove: AST-aware rename detection or semantic refactor tracking.
- This remains a conservative heuristic and intentionally falls back to `modify` when confidence is not high.
