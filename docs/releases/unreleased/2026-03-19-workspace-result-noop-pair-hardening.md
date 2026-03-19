---
type: fix
scope: workspace
audience: developer
summary: Prevent no-op workspace result path pairs from surfacing as rename-like audit closure detail.
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

The workspace result summarizer now rejects structured rename path pairs when both sides resolve to the same path. This hardens `renamed` object and array-entry closure summaries so they no longer emit `rename-like` detail for no-op pairs like `fromPath === toPath` or `sourcePath === targetPath`.

## Why it matters

Top-level workspace rename pair parsing already treated same-path pairs as non-events, but the structured entry path-pair helper did not. That mismatch could cause final audit detail to incorrectly imply a rename-like result even when nothing actually moved.

## Demo posture / limitations

This is a conservative bug fix in workspace result closure formatting only. It does not change approval routing or widen any result parsing beyond the existing explicit path-pair shapes.
