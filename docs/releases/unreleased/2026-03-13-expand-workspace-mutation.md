---
type: feature
scope: workspace
audience: developer
summary: Expanded the alpha workspace-mutation path heuristics with repo automation, key config, and workspace-escape coverage.
breaking: false
demo_ready: true
tests:
  - node .\node_modules\typescript\bin\tsc --noEmit
  - node .\node_modules\vitest\vitest.mjs run tests\unit\input-normalization.test.ts tests\unit\path-rules.test.ts tests\integration\openclaw-adapter-pipeline.test.ts tests\integration\openclaw-clawguard-plugin.test.ts
artifacts:
  - src/adapters/openclaw/normalization.ts
  - src/orchestration/classifier/path-rules.ts
  - tests/unit/input-normalization.test.ts
  - tests/unit/path-rules.test.ts
  - tests/integration/openclaw-adapter-pipeline.test.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
  - plugins/openclaw-clawguard/README.md
  - plugins/openclaw-clawguard/src/routes/settings.ts
---

## What changed

- Extended workspace-mutation normalization so `apply_patch` can keep `patchPath`, `*** Move to:`, and rename/copy headers inside the same shared file-mutation path set.
- Added small alpha-safe path heuristics for `.git/hooks`, `.github/workflows`, key workspace config files, and obvious out-of-workspace writes.
- Kept the plugin on the same Core classifier and approval semantics while extending focused unit and integration coverage.

## Why it matters

- The alpha install demo can now explain a few more realistic fake-only workspace mutation paths without adding a second classifier or widening product scope.
- Repository automation and config-file changes now land in the same workspace mutation approval surface as existing `write` / `edit` / `apply_patch` actions.
- Obvious workspace escapes are now caught early enough to stay reviewable and auditable.

## Demo posture / limitations

- What this update proves: the current install demo has broader explainable workspace-mutation heuristics on top of the existing shared Core path.
- What this update does **not** prove: real dangerous execution, broad production-grade filesystem governance, or new non-workspace tool coverage.
- Any demo-only / unpublished reminder: this remains fake-only, local-first, and unpublished.
