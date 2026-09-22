# 11 URL 展示页

Status: ready-for-agent
Blocked by: 10

路由 `/nav`，`platforms: ['pc','mobile']`。

## 要做

- 所有分类**一次性平铺**，不做 tab 切换
- `repeat(auto-fill, minmax(160px, 1fr))` 自适应列数
- 顶部**常用区**：`clickCount` Top 8 + 「重置统计」按钮
- 顶部过滤框，**纯前端过滤**（几十条数据不走后端）
- 点击新标签页打开，同时 `navigator.sendBeacon` 上报（不阻塞跳转）
- **图标**：默认域名首字母色块（按域名哈希出固定底色），`icon` 字段有值则用它（URL 或 emoji）

## 验收

- PC 宽屏铺满多列，手机单列
- 点击跳转不被上报阻塞；上报失败不影响跳转
- 纯函数（哈希配色、过滤、Top N）有单测
