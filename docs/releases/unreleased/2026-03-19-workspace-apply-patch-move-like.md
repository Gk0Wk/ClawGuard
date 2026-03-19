---
type: feature
scope: workspace
audience: developer
summary: Recognize conservative add/delete workspace moves as rename-like when the filenames stay the same across directories.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test
artifacts:
  - src/adapters/openclaw/normalization.ts
  - tests/unit/input-normalization.test.ts
  - tests/integration/openclaw-adapter-pipeline.test.ts
---

## What changed

The OpenClaw normalization layer now treats a narrow `apply_patch` pattern as `rename-like`: one added file and one deleted file with the same filename across different directories. Existing `add`, `delete`, and `modify` handling stays intact, and broader mixed or ambiguous patches still fall back to conservative semantics.

## Why it matters

This tightens a common workspace-mutation move signal without widening the misclassification surface. The approval and audit surfaces can now explain an obvious file move more accurately, which keeps the workspace `operation_type` aligned with what the operator likely intended.

## Demo posture / limitations

This is still install-demo alpha behavior. It does not infer general renames from arbitrary content similarity, and it does not reinterpret mixed multi-file patches as moves unless the signal is extremely narrow. It also does not expand workspace coverage beyond the existing fake-only mutation surface.
