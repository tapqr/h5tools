# 16 天气领域文档搬迁

Status: resolved
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

## Comments

**已完成（2026-09-22）。**

- `docs/contexts/weather/CONTEXT.md` —— 术语表整体搬来（数据可用性的三个词、
  分歧、共识判定、一致性评级），新增「皮肤与作用域」一组，
  并把原来的「部署前缀」三条**删掉**：那是 weather-app 子路径部署特有的，
  这里站点挂根路径，留着只会误导
- 两份 ADR 搬入并更新
- `CONTEXT-MAP.md` 里的代码位置按搬迁后的实际路径修正
- 凭据申请入口一并搬来（和风那条尤其重要：要用控制台里的**专属 API Host**，
  不是文档示例里的公共域名，用错了会请求失败）

### ADR-0001 的文档冲突：已核对，不推翻

那份 ADR 的论证写的是 `:root[data-daypart]`，而 issue 15 把作用域降到了 `.weather-page`。

**核对结论：不推翻该决定。** CSS 变量照样通过继承到达 SVG，
「手写 SVG 零胶水、canvas 图表库必须在 JS 里持有一份色值」这个理由完全成立。
正文措辞已同步，并在文末加了「搬迁说明」写清楚改了什么、为什么不影响结论。

### ADR-0002 补了一句搬迁后的新语境

并入一个"工具集合站"之后，这条反而**更**需要被看见：站里其他功能
（比如 URL 导航的「常用」区）都在替用户做排序和归纳，容易让人觉得
天气页"也该给个结论"。判断标准仍是那一条：**呈现**差异还是**评价**差异。
