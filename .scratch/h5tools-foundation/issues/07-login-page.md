# 07 登录页与会话接入

Status: resolved
Blocked by: 04, 06

## 要做

- 登录页，双端适配（`['pc','mobile']`）
- 前端 401 拦截器：统一跳登录页并记住来路
- 登录态放 Pinia，刷新后用 `GET /api/auth/me` 恢复
- 登录后的空首页（占位，后续被 URL 导航页取代）
- 登出

## 验收

- 未登录访问任意页面跳登录
- 登录后回到原本要去的页面
- 关掉浏览器再开仍登录（30 天滑动）

## Comments

**已完成（2026-09-22）。** 登录链路在真实运行的后端上端到端验证通过：

```
health(@Public)          200
未登录 /auth/me           401
错误密码                  401  账号或密码不正确
正确密码                  200  Set-Cookie: h5tools_sid=...; HttpOnly; SameSite=Lax
带 cookie /auth/me        200  {"username":"admin",...}
登出                      204
登出后再访问               401  会话已失效
```

`Set-Cookie` 里**没有 `Secure`** —— 本地是 http，带了浏览器不会回传。生产会带。

### 会话恢复要挡在守卫前面

路由守卫里先 `await auth.restore()` 再判断登录状态。不这么做的话，刷新页面时
store 还是空的，守卫会把已登录的用户弹去登录页，然后恢复完成又弹回来 ——
表现为每次刷新都闪一下登录页。

### 401 拦截不让 api 层依赖 router

`api/client.ts` 暴露一个 `setUnauthorizedHandler`，由 router 注册回调。
反过来让 api 直接 import router 会形成环（router 的守卫要用 auth store，
auth store 要用 api）。

### 两处移动端细节

- 输入框字号 16px：iOS Safari 在小于 16px 的输入框聚焦时会放大整个页面
- 登录卡片顶部留 `env(safe-area-inset-top)`，别顶到刘海下面
