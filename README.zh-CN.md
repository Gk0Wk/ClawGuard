# ClawGuard / 龙虾卫士

<p align="center">
  <img src="./assets/hero-banner-zh.png" alt="ClawGuard hero banner" width="100%" />
</p>

<p align="center">
  <strong>OpenClaw 的安全卫士。</strong><br />
  拦危险动作、查 skills、堵泄密、把最后一票还给人。
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="#它是什么">它是什么</a> ·
  <a href="#现在已经能演示什么">现在已经能演示什么</a> ·
  <a href="#安装-demo">安装 Demo</a> ·
  <a href="#demo-场景">Demo 场景</a> ·
  <a href="#当前限制">当前限制</a> ·
  <a href="#文档地图">文档地图</a>
</p>

## 它是什么

`ClawGuard`（龙虾卫士）是 **OpenClaw 的安全控制层**。

如果你是第一次来到这个仓库，最短的一句话是：

> **ClawGuard = The antivirus for OpenClaw。**

它的目标是在 OpenClaw 和高风险动作之间加上一层“先问人、可解释、可审计”的安全闸门。

## 现在已经能演示什么

这个仓库现在已经有了**第一条 OpenClaw 安装 Demo**。

当前 demo 覆盖范围是：

- **高风险 `exec`**
- **最小 outbound 覆盖**
- **最小 workspace mutation 覆盖（当前统一指 `write` / `edit` / `apply_patch` 这组动作）**
- **插件自带的 approvals / audit / settings 页面**：
  - `/plugins/clawguard/settings`
  - `/plugins/clawguard/approvals`
  - `/plugins/clawguard/audit`

当前仓库状态也要说清楚：

- 现在仍然是 **文档优先 + Sprint 0 代码骨架阶段**
- 当前可安装路径是 **install demo 基线**，不是正式产品发布
- 这个 demo 主要证明的是首个宿主接入、页面入口和最小审批 / 审计闭环，不是完整产品能力

## 安装 Demo

安装 Demo 的主入口在这里：

- [`plugins/openclaw-clawguard/README.md`](./plugins/openclaw-clawguard/README.md)

推荐安装方式：站在仓库根目录执行本地路径安装：

```powershell
openclaw plugins install .\plugins\openclaw-clawguard
```

可选的本地 tarball 路径（仅用于本地 demo 打包）：

```powershell
pnpm --dir plugins\openclaw-clawguard pack
openclaw plugins install .\plugins\openclaw-clawguard\<generated-tarball>.tgz
```

这里的口径必须保持诚实：

- 当前只是 **install demo**
- **没有发布到任何 registry**
- `@clawguard/openclaw-clawguard` 目前只是 **元数据 / 未来兼容命名占位**
- 这里**不代表** npm publish、GA 或正式 release 已经存在

安装后请重启 OpenClaw，再按插件 README 里的 operator runbook 走 smoke path、1 分钟 demo 顺序和 3 分钟 demo 顺序。

## Demo 场景

当前适合公开演示的内容，应该被理解为一组**克制的最小场景**：

1. **Risky exec**
   - 高风险动作会被阻断或进入审批队列
   - 结果会落到 approvals / audit 页面
2. **Minimal outbound**
   - 先证明最小 outbound 审批 / 阻断姿态
   - 不把它包装成完整 outbound 生命周期
3. **Minimal workspace mutation**
   - 风险文件改动可以走相同的审批 / 审计链路
   - 当前对外统一口径是：`write` / `edit` / `apply_patch` 都属于这条 workspace mutation actions demo surface
4. **插件页面演示面**
   - settings / approvals / audit 是当前 demo 的主要承载面

对外叙事上，主 Demo 仍然是：

> **一句群消息差点让 OpenClaw 发红包；ClawGuard 把最后一票还给了人。**

但仓库里当前这条 demo，更准确的理解应该是：**本地安装 + 页面 smoke + fake-only 的安全演示链路**，而不是已经证明真实转账、真实危险执行或完整运行时能力。

## 当前限制

请按当前阶段来理解这个仓库：

- **install demo only**
- **推荐方式是仓库根目录本地路径安装**
- **本地 tarball 只是可选的本地 demo 路径**
- **未发布**
- **不是正式 release**
- **不能当成 GA 或完整产品发布来理解**
- **outbound 覆盖仍然是最小版本**
- **宿主级 outbound 当前只有 `message_sending` hard block，不是完整 outbound 生命周期**
- **审批闭环当前仍然是 pending-action + allow-once retry 的 demo 形态**
- **不应把当前 demo 理解成真实危险执行、真实红包 / 转账执行，或正式发布级验证**

## 文档地图

### 先看这些

- [`plugins/openclaw-clawguard/README.md`](./plugins/openclaw-clawguard/README.md) — install demo 入口、operator runbook、推荐安装命令、本地 tarball 备选路径、smoke path、1 分钟 / 3 分钟 demo 顺序
- [`docs/v1-installer-demo-strategy.md`](./docs/v1-installer-demo-strategy.md) — install demo 口径、插件优先路线与“未发布”说明
- [`docs/v1-north-star-demo-script.md`](./docs/v1-north-star-demo-script.md) — 主 demo 叙事：“群消息诱导 OpenClaw 发钱，被 ClawGuard 拦住”

### 产品与实现背景

- [`docs/system-architecture.md`](./docs/system-architecture.md) — 总体平台架构
- [`docs/v1-implementation-breakdown.md`](./docs/v1-implementation-breakdown.md) — V1 实现拆分与顺序
- [`docs/v1-development-readiness-checklist.md`](./docs/v1-development-readiness-checklist.md) — 正式扩开发前还要收口什么
- [`docs/security-methodology.md`](./docs/security-methodology.md) — 龙虾卫士防护方法

### 定位与传播背景

- [`docs/star-strategy.md`](./docs/star-strategy.md) — GitHub 首屏定位与传播策略
- [`README.md`](./README.md) — 英文入口
- [`TODO.md`](./TODO.md) — 当前结论与下一步 README / install demo 收口项
