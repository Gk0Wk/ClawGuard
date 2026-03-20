# First Usable Version Acceptance Checklist

Use this checklist before sharing the current install-demo baseline as the **first usable version**.

- [ ] Default install path stays `openclaw plugins install .\plugins\openclaw-clawguard`
- [ ] Optional tarball path stays local-only and unpublished
- [ ] Browser-facing smoke path works on `/clawguard`, `/clawguard/checkup`, `/clawguard/approvals`, `/clawguard/audit`, and `/clawguard/settings`
- [ ] Protected backing routes remain available under `/plugins/clawguard/*` for the public shell and regression coverage
- [ ] Demo order stays fake-only across `exec`, outbound, and workspace mutation examples
- [ ] Public wording says **install-demo only / unpublished / fake-only**
- [ ] Public wording does **not** claim GA, registry publish, real outbound proof, real money movement, or broad workspace coverage
- [ ] Public wording does **not** imply a native Control UI left-nav `Security` tab
- [ ] Validation baseline remains `pnpm typecheck` and `pnpm test`
