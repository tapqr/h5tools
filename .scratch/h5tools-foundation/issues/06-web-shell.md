# 06 前端骨架与 AppShell

Status: resolved
Blocked by: 01

端的判定规则见 spec 第 6 节。**「端」和「断点」是两个概念，不可混用一个判据。**

## 要做

- vue-router，`VITE_BASE_PATH` 默认 `/`，**router base 与它共用同一个值**（只此一处）
- `usePlatform()` composable：UA + `(pointer: coarse)` 判定一次存 store。平板归 PC 侧
- 路由 `meta.platforms`：`['pc']` / `['mobile']` / `['pc','mobile']`
- 全局守卫：访问当前端不支持的页面 -> 提示页（不是白屏、不是 404）
- `AppShell`：PC 顶栏 / 移动端底部 tab，**导航入口按当前端过滤**
- 外壳要支持「让位」模式（供天气页全屏沉浸用）
- 全局样式 token 定义在 `:root`，但**留意不要与天气页的 token 同名冲突**

## 验收

- PC 上把窗口拖窄到 900px，仅-PC 页面**照常可用**（横向滚动即可），不被拦截
- 手机访问仅-PC 页面得到清晰提示
- 导航里不出现当前端用不了的入口

## Comments

**已完成（2026-09-22）。** 12 个前端用例全绿。

### 端判定写成了纯函数

`platform/detect.ts` 的 `detectPlatform({ userAgent, coarsePointer })` **签名里没有视口宽度** ——
这不是省略，是设计：判定函数拿不到宽度，"PC 上拖窄窗口导致仅-PC 页面被判成不支持"
这件事在结构上就不可能发生。测试里有一条专门盯着这个理由。

平板的两种情况都覆盖了：Android 平板的 UA 里没有 `Mobile` 一词（正好与手机区分），
iPadOS 13+ 的 Safari 默认伪装成 Macintosh，只能靠 `pointer: coarse` 兜住。两者都归 PC 侧。

没有任何手机特征的触屏设备（触屏一体机、Windows 平板）也留在 PC 侧：
宁可给大屏设备一个不够顺手的 PC 布局，也不要把它塞进单列手机布局。

### 路由的两个默认值都倒向安全

- `meta.public` 缺省为 false：漏标的后果是「要登录才能看」，误标的后果是「裸奔」
- `meta.platforms` 缺省为两端都适配：漏标的后果是页面能打开（可能不好看），
  而不是打不开

有测试断言「只有 login / unsupported / not-found 是 public」—— 以后误标一个就会红。

### SettingsPage 是「仅 PC 页面」的参考实现

它有 `min-width: 640px` 且**刻意不做窄屏适配**。PC 上拖窄窗口时它横向滚动，
不会被拦截；手机上导航里根本不出现它的入口，直接访问则命中提示页。
