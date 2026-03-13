---
type: feature
scope: outbound
audience: public
summary: Added install-demo package metadata and connected the first host-level outbound hard-block hook.
breaking: false
demo_ready: true
tests:
  - pnpm test
artifacts:
  - plugins/openclaw-clawguard/package.json
  - plugins/openclaw-clawguard/openclaw.plugin.json
  - plugins/openclaw-clawguard/src/hooks/message-sending.ts
  - plugins/openclaw-clawguard/src/routes/settings.ts
  - tests/integration/openclaw-clawguard-plugin.test.ts
---

## What changed

- Added install-demo package metadata for the OpenClaw plugin, including local-path install posture and manifest alignment.
- Connected the first host-level outbound hook via `message_sending` to support direct-send hard block behavior.
- Exposed install-demo metadata through the settings route so operators could see install guidance and current posture inside the plugin.

## Why it matters

- The plugin became easier to explain and install as a real local demo package rather than an internal spike only.
- Outbound coverage became more honest and more host-aware by separating direct host sends from tool-level approval flows.
- Settings could now act as part of the install smoke path.

## Demo posture / limitations

- What this update proves: the OpenClaw demo plugin has meaningful local install metadata and the first host-level outbound hard-block path.
- What this update does **not** prove: registry publish, complete outbound lifecycle coverage, or a formal release process.
- Any demo-only / unpublished reminder: the package name stayed as an unpublished compatibility placeholder and the demo remained local-install only.
