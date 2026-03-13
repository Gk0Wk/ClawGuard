# Release Notes Workflow

本目录用于沉淀结构化变更条目，并在发布时生成两层说明：

- 外部版（用户可读，强调“证明什么 / 不证明什么”）
- 内部版（开发可追溯，按 feature/fix/docs/test 分类）

## 目录约定

- `unreleased/`：每轮改动的变更条目（changeset）
- `templates/`：发布说明模板与公告模板

## 条目文件命名

使用：`YYYY-MM-DD-<scope>-<slug>.md`

示例：`2026-03-13-demo-install-messaging.md`

## 条目必填 frontmatter

- `type`: `feature|fix|docs|refactor|test|chore`
- `scope`: `demo|plugin|runtime|outbound|workspace|exec|docs|ci`
- `audience`: `public|developer|internal`
- `summary`: 一句话摘要
- `breaking`: `true|false`
- `demo_ready`: `true|false`
- `tests`: 本轮验证命令列表
- `artifacts`: 关键文件列表

## 使用方式（推荐）

1. 每完成一轮有意义改动，新增一条 `unreleased/*.md`
2. 发布前收集该目录条目，按 `type/scope/audience` 汇总
3. 基于 `templates/` 生成外部版和内部版发布说明
