# 15 weather 前端搬迁

Status: resolved
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

## Comments

**已完成（2026-09-22）。** 组件、store、api、utils、composables 与**全部组件测试**搬入
`src/weather/`，前端测试从 50 涨到 207 全绿。`App.vue` 降级为 `pages/WeatherPage.vue`
纳入路由（原项目完全没用 vue-router，直接 mount）。

### 样式泄漏比预想的严重，而且只降 `:root` 是不够的

原计划只说把 `:root[data-daypart]` 降成 `.weather-page[data-daypart]`。实际检查发现
`weather.css` 里还有一批**应用级全局规则**：`*`、`body`、`#app`、`button`、`ul`、`p`。

这些在独立应用里完全正常，但搬进来之后是真问题：这份 CSS 通过非 scoped 的 `<style>`
引入，**全局注入且永不卸载**；而天气页是懒加载路由 —— **只要访问过一次天气页，
`body` 的渐变背景和 `#app` 的 520px 限宽就会留在整个会话里**，
把导航页也变成一条窄列、背景还是天气色。

全部收进了 `.weather-page` 作用域。`#app` 那条限宽改由内层 `.app` 承担 ——
模板还原成**两层结构**（外层铺满整屏放渐变，内层限宽 520px 居中），
对应搬迁前的 `body` + `#app`。合成一层的话，要么背景填不满屏，
要么桌面上内容被拉成整屏宽。

### 用一条结构性测试钉住它

`tests/weather-css.spec.ts` 断言「每一个顶层选择器都被 `.weather-page` 限定」
且「不含 `:root`」。**这种坏法是完全静默的** —— 不报错，只是别的页面莫名其妙变了样，
而且要先访问天气页才复现。

这条测试自己也返工了两次，都值得记：
1. 第一版按**行**匹配选择器（要求行尾是 `{`），反向验证时发现
   `body { background: red; }` 这种一行写完的规则直接漏过。改成按嵌套层级扫描。
2. `:root` 那条一开始命中的是我自己写的**注释文本**。先剥注释再检查。

**写完防护一定要反向验一次它真的会响。** 两种泄漏形式现在都能抓到。

### 其他改动

- `data-daypart` 从 `document.documentElement` 挪到页面根节点
- `theme-color` 进页面时记下原值、`onUnmounted` 还原，否则会一直停在天气色
- API 基址从 `VITE_API_BASE_URL` 改成同域相对路径 `/api`，并**必须带
  `credentials: 'same-origin'`** —— 接口现在要登录，漏了的症状是全部 401
- 删掉 `types/weather.ts` 与 `types/location.ts` 两份手抄副本，改引 `@h5tools/shared`
- 路由 `platforms: ['pc','mobile']` + `fullBleed: true`（外壳让位）
- 读源文件的结构性测试放 `tests/`，归 `tsconfig.node.json` 管 ——
  不让 node 类型渗进应用代码
