---
type: fix
scope: workspace
audience: developer
summary: Refine apply_patch workspace operation typing for structural insert and delete sections without explicit hunk markers.
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

- ClawGuard now treats `apply_patch` update sections without an explicit `@@` hunk as `insert` or `delete` when the section is structurally unambiguous.
- Mixed content, neutral context lines without hunk structure, and ambiguous sections still fall back to `modify`.

## Why it matters

- The workspace approval surface now recognizes a few more obvious patch shapes without becoming aggressive about inference.
- Operators get more accurate `operation_type` labels and approval titles for simple patch updates that previously collapsed to `modify`.

## Demo posture / limitations

- What this update proves: the workspace mutation classifier can distinguish more patch shapes while keeping the conservative fallback.
- What this update does **not** prove: it does not add any new workspace hooks or broader mutation coverage beyond `write` / `edit` / `apply_patch`.
- Any demo-only / unpublished reminder: this remains an install-demo plugin path, and ambiguous patches still intentionally fall back to `modify`.
