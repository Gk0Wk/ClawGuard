---
type: chore
scope: ci
audience: developer
summary: Added the first baseline CI workflow plus reusable release-note and announcement templates.
breaking: false
demo_ready: false
tests:
  - pnpm test
artifacts:
  - .github/workflows/ci.yml
  - .github/release-templates/changeset-template.md
  - .github/release-templates/release-note-public.md
  - .github/release-templates/release-note-internal.md
  - .github/release-templates/announcement.md
---

## What changed

- Added a baseline GitHub Actions workflow that runs `pnpm typecheck` and `pnpm test` on pull requests and pushes to `main`.
- Added reusable templates for changesets, public release notes, internal release notes, and announcements.
- Established the first tracked automation and release-communication skeleton for the demo stage.

## Why it matters

- Quality checks now have a clear path to automation instead of relying only on manual local verification.
- Release communication can start from structured templates rather than improvised commit summaries.
- This sets up a sustainable handoff between implementation, validation, and outward-facing demo updates.

## Demo posture / limitations

- What this update proves: the repository now has a baseline CI and release-template skeleton that can support demo-stage iteration.
- What this update does **not** prove: that `pnpm typecheck` is already clean, or that a full release pipeline / publish flow exists.
- Any demo-only / unpublished reminder: this is still release-communication scaffolding for an install-demo stage, not a formal release system.
