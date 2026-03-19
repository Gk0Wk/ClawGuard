---
type: fix
scope: workspace
audience: developer
summary: Recognize path-reference edit moves as rename-like when the same filename shifts across directories.
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

- ClawGuard now treats `edit` mutations that replace one explicit path reference with another path reference to the same filename in a different directory as `rename-like`.
- The new rule stays conservative: it only applies when both old and new text are clearly path-like references.

## Why it matters

- This captures a narrow but real workspace pattern where a configuration or reference is moved without changing the underlying filename.
- Operators get a more specific approval title and audit label for this small class of path-reference edits instead of falling back to `modify`.

## Demo posture / limitations

- This does not broaden workspace hook coverage or change the `modify` fallback for ambiguous edits.
- It remains a fake-only install-demo refinement of existing `write` / `edit` / `apply_patch` classification.
