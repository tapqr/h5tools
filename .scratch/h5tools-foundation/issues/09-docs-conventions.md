# 09 文档与约定整理

Status: ready-for-agent
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
