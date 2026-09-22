# 16 天气领域文档搬迁

Status: ready-for-agent
Blocked by: 15

## 要做

- `docs/contexts/weather/CONTEXT.md`：搬 weather-app 的 `CONTEXT.md`（数据源失败 / 字段缺失 / 模拟回落 / 分歧 / 共识判定 / 一致性评级；部署前缀那三条按新架构重写）
- `docs/contexts/weather/adr/0001-hand-rolled-svg-charts.md`
- `docs/contexts/weather/adr/0002-no-consensus-verdict.md`
- 在 `CONTEXT-MAP.md` 登记

## 必须 flag 的文档冲突

ADR-0001 的论证写的是 `:root[data-daypart]`，而 issue 15 把作用域降到了 `.weather-page`。

**这不推翻该决定** —— CSS 变量照样继承到 SVG，「手写 SVG 零胶水、canvas 图表库要在 JS 里持有一份色值」的理由完全成立。但措辞会过时，**搬迁时更新为 `.weather-page[data-daypart]`**，并在 ADR 里注明改动原因。

## 验收

- 术语表里的词与代码里的命名一致
- ADR 措辞与现实相符
