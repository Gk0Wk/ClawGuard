---
type: docs
scope: docs
audience: public
summary: Align release and acceptance drafts to the /clawguard public-shell entry path
breaking: false
demo_ready: true
tests:
  - pnpm test -- --run tests/integration/openclaw-clawguard-plugin.test.ts
artifacts:
  - docs/releases/2026-03-14-first-usable-version-release-note-public-draft.md
  - docs/releases/2026-03-14-first-usable-version-release-note-internal-draft.md
  - docs/releases/2026-03-14-first-usable-version-announcement-draft.md
  - docs/releases/2026-03-14-first-usable-version-acceptance-checklist.md
---

## What changed

The first-usable-version public draft, internal draft, announcement draft, and acceptance checklist now treat `/clawguard*` as the browser-facing user entry path. They also keep `/plugins/clawguard/*` explicitly framed as protected backing routes rather than the primary user-facing smoke path.

## Why it matters

Recent runtime work made `/clawguard*` the supported no-core-patch browser entry flow. Leaving the older release drafts on raw `/plugins/clawguard/*` wording would keep pointing users at the route family that still returns `401` when opened directly without gateway auth.

Aligning the release docs to the public shell posture keeps the outward story consistent with the actual browser path and with the current security boundary.

## Demo posture / limitations

This does not remove the protected `/plugins/clawguard/*` routes. They remain part of the implementation surface and regression path behind the public shell.

This remains Alpha install-demo only, local-only, unpublished, and fake-only.
