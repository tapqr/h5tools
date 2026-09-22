# 09 文档与约定整理

Status: resolved
Blocked by: 01

## 要做

- `AGENTS.md`：项目名从 **qnbrower**（模板残留）改为 h5tools
- 新建根 `CONTEXT-MAP.md`，指向各上下文
- `docs/contexts/` 目录骨架
- **更新 `docs/agents/domain.md`**：它描述的多上下文布局是 `src/<context>/CONTEXT.md`，我们用 `docs/contexts/<name>/`，因为 workspaces 下一个上下文横跨 `apps/api` 与 `apps/web`。须写明这个偏离及其理由
- 把 weather-app `CLAUDE.md` 里的通用约定并入 `AGENTS.md`：Node >= 22.14、后端 ESM 导入带 `.js`、`*.e2e.spec.ts` 命名、禁用 bun、`@nestjs/throttler` 的 overrides 不要顺手删

## 验收

- 仓库里不再出现 qnbrower
- 新人（或 agent）只读 AGENTS.md + CONTEXT-MAP.md 就能找到该读的东西

## Comments

**已完成（2026-09-22）。**

- `AGENTS.md` 重写：项目名不再是模板残留的 qnbrower。核心是一张
  「硬约定 + 不遵守会怎样」的表 —— 每一条都是这个仓库真踩过的，光写规则没用，
  要写清楚违反后会以什么方式坏掉
- 新建 `CONTEXT-MAP.md`，含一张「上下文 -> 代码位置」的表（workspaces 下
  一个上下文横跨两个包，没有这张表就找不着）
- `docs/agents/domain.md` 补上本仓库对它所描述布局的偏离及理由
- 沉淀了 3 条系统级 ADR + 认证上下文的术语表与 1 条 ADR

### 写了哪几条 ADR，以及为什么是这几条

只写那些**「以后有人会想改回去」**的决定：

- `0001-modular-monolith` —— "后续还会集成其他功能"听起来像拆微服务的理由，
  实际恰恰相反。这个反直觉的点必须留档
- `0002-platform-by-device-not-viewport` —— 判定函数签名里没有视口宽度是设计不是疏漏，
  很容易被后来者"顺手修好"
- `0003-shared-types-need-project-references` —— 这条保障断掉是**静默的**，
  所以 ADR 里直接写了验证方法

`nav` 与 `weather` 两个上下文的目录已建好，内容随对应 issue 一起写。
