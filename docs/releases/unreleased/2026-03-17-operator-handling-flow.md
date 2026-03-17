---
type: feature
scope: plugin
audience: public
summary: Tightened the Alpha operator handling flow so dashboard/checkup actions map cleanly into approvals, audit replay, and settings follow-up.
breaking: false
demo_ready: true
tests:
  - pnpm typecheck
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - plugins/openclaw-clawguard/src/routes/shared.ts
  - plugins/openclaw-clawguard/src/routes/dashboard.ts
  - plugins/openclaw-clawguard/src/routes/checkup.ts
  - plugins/openclaw-clawguard/src/routes/approvals.ts
  - plugins/openclaw-clawguard/src/routes/audit.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added a lightweight shared operator-action layer so the same action IDs, labels, destinations, and operator intent are reused across dashboard, checkup, approvals, and audit.
- Extended the dashboard/checkup posture payload so each checkup item carries a stable recommended action, main drag carries its mapped action, and fix-first stays derived from that same UI-facing mapping.
- Tightened the approvals-to-audit handoff so live queue items explain when the next step is still on Approvals, when the operator should retry once, and when the trail has moved fully into Audit replay.
- Clarified audit replay for approval-originated flows without changing audit persistence or the approval state machine.

## Why it matters

- The current Alpha surface now reads more like one operator handling chain: see the issue on Dashboard, understand it on Checkup, act in Approvals, and confirm closure in Audit.
- The action mapping is more testable and less likely to drift because the UI pages no longer invent separate names for the same follow-up step.

## Demo posture / limitations

- What this proves: the plugin-owned Alpha control surface can now express a clearer handling flow over the same existing approvals, audit, settings, and install-demo posture data.
- What this does **not** prove: a stock Control UI `Security` tab, patched navigation, new runtime hooks, broader protection coverage, or a full production checkup/scoring system.
- Any demo-only / unpublished reminder: this remains install-demo only, unpublished, fake-only, and direct-route based.
