# 06 前端骨架与 AppShell

Status: ready-for-agent
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
