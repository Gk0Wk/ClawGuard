---
type: feature
scope: plugin
audience: developer
summary: Persisted shared Core approval titles into the plugin live queue so workspace approval semantics are visible directly on the Approvals surface.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm exec vitest run tests/integration/openclaw-clawguard-plugin.test.ts
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/types.ts
  - plugins/openclaw-clawguard/src/services/state-repository.ts
  - plugins/openclaw-clawguard/src/services/state.ts
  - plugins/openclaw-clawguard/src/routes/approvals.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
  - TODO.md
---

## What changed

- Added `action_title` to the plugin's pending-action model and persisted it through the live state repository.
- Wired pending-action creation to reuse the shared Core approval title instead of rebuilding a separate plugin-only label.
- Updated the Approvals page so the live queue now renders those richer titles directly, making workspace semantics such as `rename-like` or `modify` visible in the operator-facing queue header and metadata line.

## Why it matters

- The live operator surface now reflects the same approval semantics the shared Core already computed, instead of forcing the user to infer them only from guidance text.
- This reduces duplication between Core and plugin presentation and keeps the plugin queue aligned with the current Alpha approval model.

## Demo posture / limitations

- What this proves: the install-demo plugin can surface richer approval semantics on the existing Approvals page without changing the underlying decision pipeline.
- What this does **not** prove: broader outbound route visibility in plugin pages when the host does not supply session delivery context, or a production-grade approval UX.
- Any demo-only / unpublished reminder: the project remains Alpha, install-demo only, unpublished, and fake-only.
