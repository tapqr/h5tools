# 15 weather 前端搬迁

Status: ready-for-agent
Blocked by: 14, 06

源：`/home/huangyingming/test-code/weather-app/frontend`。**`gemini-version/` 不搬。**

## 要做

- `App.vue` 降级为 `WeatherPage.vue` 纳入路由（原项目完全没用 vue-router，直接 mount）
- 组件、store、api、utils、composables 整体搬入，**组件测试一并搬**
- **样式作用域降级**：`style.css` 里 `:root[data-daypart='…']` 改为 `.weather-page[data-daypart='…']`；`data-daypart` 写页面根节点而非 `document.documentElement`。**组件的 scoped style 一行不动**（只引用 `var()`，变量定义在哪个祖先上都行）
- `meta[name=theme-color]`：进入页面时设置，**离开时还原**
- 通用 token（`--font-sans`、`--radius-card`、`--gap`、`--page-pad`）与全站 token 的冲突要处理掉
- **保留全屏沉浸**，外壳让位（顶栏透明或只留返回）
- `platforms: ['pc','mobile']` —— 它本来就没有媒体查询，PC 上是 520px 居中列，是天气类应用的通行做法

## 验收

- 从天气页跳到 URL 导航页，**配色不残留**（这是本 issue 的核心风险）
- 昼/晨昏/夜三套配色照常切换
- 搬来的组件测试全绿
