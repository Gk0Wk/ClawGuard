---
type: feature
scope: workspace
audience: developer
summary: Added the first workspace-mutation audit loop covering pending approval, allow-once retry, and post-execution outcomes.
breaking: false
demo_ready: true
tests:
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/src/hooks/after-tool.ts
  - plugins/openclaw-clawguard/src/services/state.ts
  - tests/integration/openclaw-adapter-pipeline.test.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added a dedicated `after_tool_call` hook for the plugin and wired workspace-mutation final outcomes back into audit.
- Extended the plugin state flow so `write` and `apply_patch` could move through pending approval, allow-once retry, and final allowed/failed/blocked audit states.
- Added integration coverage to verify workspace mutation behavior against shared Core approval semantics.

## Why it matters

- Workspace mutation stopped being a before-hook-only spike and became a minimum end-to-end audited flow.
- Demo scenarios around risky file changes could now be explained with both approval intent and final execution outcome.
- This reduced the gap between exec and workspace behavior inside the plugin.

## Demo posture / limitations

- What this update proves: the install demo can show a complete minimum approval-and-audit loop for `write` and `apply_patch`.
- What this update does **not** prove: broad workspace host coverage, complex range heuristics, or full production-grade mutation governance.
- Any demo-only / unpublished reminder: this remained a fake-only install-demo workflow, not a formal release guarantee.
