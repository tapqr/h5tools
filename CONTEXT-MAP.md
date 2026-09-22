# Context Map

这个仓库是一个**模块化单体**：一个后端服务，一个功能一个 Module，
各功能有各自的领域语言。上下文之间是隔离的 —— 天气那套术语（分歧、数据源失败、
字段缺失）和 URL 导航完全不相干。

上下文的文档放在 `docs/contexts/<name>/`，而**不是** `docs/agents/domain.md` 描述的
`src/<context>/`。原因见那份文档里的说明：在 npm workspaces 下，一个上下文横跨
`apps/api` 与 `apps/web` 两个包，没有单一目录可以放它的 `CONTEXT.md`。

| 上下文 | 文档 | 代码 |
|---|---|---|
| 账号与会话 | [`docs/contexts/auth/`](docs/contexts/auth/) | `apps/api/src/auth`、`apps/api/src/user`、`apps/web/src/stores/auth.ts` |
| URL 导航 | [`docs/contexts/nav/`](docs/contexts/nav/) | `apps/api/src/nav`、`apps/web/src/nav`、`apps/web/src/pages/Nav*.vue` |
| 天气对比 | [`docs/contexts/weather/`](docs/contexts/weather/) | `apps/api/src/weather`、`apps/api/src/geo`、`apps/web/src/weather`、`apps/web/src/pages/WeatherPage.vue` |

系统级的决策（跨上下文的）放在 `docs/adr/`。
