# First Usable Version Acceptance Checklist

Use this checklist before sharing the current install-demo baseline as the **first usable version**.

- [ ] Default install path stays `openclaw plugins install .\plugins\openclaw-clawguard`
- [ ] Optional tarball path stays local-only and unpublished
- [ ] Smoke path works on `/plugins/clawguard/settings`, `/plugins/clawguard/approvals`, and `/plugins/clawguard/audit`, with repeatable HTTP-level regression coverage for HTML/JSON audit responses
- [ ] Demo order stays fake-only across `exec`, outbound, and workspace mutation examples
- [ ] Public wording says **install-demo only / unpublished / fake-only**
- [ ] Public wording does **not** claim GA, registry publish, real outbound proof, real money movement, or broad workspace coverage
- [ ] Public wording does **not** imply a native Control UI left-nav `Security` tab
- [ ] Validation baseline remains `pnpm typecheck` and `pnpm test`
