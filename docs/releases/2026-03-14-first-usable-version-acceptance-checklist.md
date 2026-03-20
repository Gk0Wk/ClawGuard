# First Usable Version Acceptance Checklist

Use this checklist before sharing the current install-demo baseline as the **first usable version**.

- [x] Default install path stays `openclaw plugins install .\plugins\openclaw-clawguard`
- [x] Optional tarball path stays local-only and unpublished
- [x] Browser-facing smoke path works on `/clawguard`, `/clawguard/checkup`, `/clawguard/approvals`, `/clawguard/audit`, and `/clawguard/settings`
- [x] Protected backing routes remain available under `/plugins/clawguard/*` for the public shell and regression coverage
- [x] Demo order stays fake-only across `exec`, outbound, and workspace mutation examples
- [x] Public wording says **install-demo only / unpublished / fake-only**
- [x] Public wording does **not** claim GA, registry publish, real outbound proof, real money movement, or broad workspace coverage
- [x] Public wording does **not** imply a native Control UI left-nav `Security` tab
- [x] Validation baseline remains `pnpm typecheck` and `pnpm test`

Validated on 2026-03-20 against the current `/clawguard*` public shell entry, the protected `/plugins/clawguard/*` backing routes, `pnpm typecheck`, `pnpm test`, local tarball packaging, HTTP smoke, and browser smoke through the public shell connect page.
