# h5tools 地基与首批功能

Status: ready-for-agent

个人效率工具站。登录后可用，PC 与移动端按页面各自适配。首批两个功能：URL 导航管理、天气对比（从 `/home/huangyingming/test-code/weather-app` 搬迁）。此后持续增加新工具。

本文是 2026-09-22 grilling 会话的产物，记录 15 项已拍板的决定及其理由。**理由比结论重要** —— 以后条件变了要重新评估时，看的是理由。

## 1. 架构：模块化单体

一个后端服务，一个功能一个 Module，共用登录、错误格式、数据库连接。**不拆微服务。**

理由：功能越杂、单个功能越小，拆服务的边际成本越高 —— 每个新工具都要额外付一份部署、配置、鉴权打通的税。等某个工具真的需要独立伸缩再拆。

```
h5tools/
├── apps/web/          Vite + Vue3 + TS + Pinia + vue-router
├── apps/api/          NestJS 12 (ESM) + Prisma
├── packages/shared/   前后端共享的 DTO 与类型
├── docs/
│   ├── contexts/<name>/{CONTEXT.md, adr/}
│   └── agents/
├── CONTEXT-MAP.md
└── AGENTS.md
```

## 2. 后端语言：TypeScript + NestJS

理由：这类项目的瓶颈不是性能，是「加一个功能要动几个地方」。前端已锁定 Vue3+TS，后端同语言可让**接口契约变成编译期保证**。NestJS 的 Guard/Pipe/Filter 让横切关注点写一次全局生效，Module+DI 给出「一个功能一个边界」的模板。

**这个结论与 weather-app 的存量无关** —— 完全抛开它重新推导，答案相同。它恰好也是 NestJS，是白捡的收益。

会改口的条件：公司强制技术栈 / 要交给纯 Java 团队维护。**已确认不适用**（个人效率项目）。

## 3. 仓库结构：npm workspaces

`apps/web` + `apps/api` + `packages/shared`。

理由：兑现「选 TS 是为了共享类型契约」这个论据 —— 不建共享包，那份收益只剩一半。

**这主动推翻了 weather-app 的一个决定**（它的 README 写明「前后端是两个独立部署单元，不共享 npm 包」）。那个决定在「单一天气应用」语境下正确；在「持续增加工具的聚合仓库」语境下前提变了。weather-app 自己的 CLAUDE.md 承认了代价：`frontend/src/types/weather.ts` 是后端 interfaces 的**手抄副本**，「没有任何自动检查会提醒你」。

**统一用 npm，禁止 bun** —— bun 重装会改 `node_modules` 属主与 ACL，共享环境下 claude-svc 会失去写权限。

## 4. 登录：多用户模型，单用户交互

`User` 表 + 所有业务表带 `userId` 外键；**不做注册页**，账号用命令行脚本创建。

理由：Prisma 里多一个 model 加一个关系成本几乎为零；反过来事后从「无用户概念」改成「有用户」要写迁移、回填、改掉每个查询。而「把书签页给同事看一眼，对方要开号」是高概率事件。

## 5. 安全姿态：应用层做扎实，不加额外门

站点公网可达，几小时内必有扫描器上门。

- **argon2id** 哈希密码
- **服务端 session 存 Redis**（非 JWT）：可即时吊销、无 token 续期问题、注销是真注销
- cookie `httpOnly + Secure + SameSite=Lax`，30 天滑动过期，**名字带前缀**（cookie 不区分端口，同子域名下别的服务会串）
- 登录接口按 **IP + 账号双维度限流**，递增延迟 + 临时锁定
- **全局 AuthGuard 默认拒绝**，只有 `@Public()` 放行 —— 以后加新功能忘了加鉴权也不会漏。**这条比其他都重要**
- **必须设 `trust proxy`** —— 在 nginx 后面不设，按 IP 限流会退化成全站共享一个额度
- 不做两步验证

**这套方案完全押在那一个密码上。** 因此：生产环境启动时若 admin 密码仍是初始弱口令，**拒绝启动**。

## 6. 端的判定：设备判定与断点分开

两个概念不可混用一个判据：

- **「端」= 设备类型**，由 UA + `(pointer: coarse)` 判定一次存入 store。决定：外壳布局、导航入口过滤、访问不支持页面时是否拦截
- **「断点」= 视口宽度**，只管「两端都适配」的页面内部排版

理由：若只用视口宽度，PC 上把窗口拖窄到 900px 会让仅-PC 页面**突然变成「不支持」** —— 纯粹的 bug 体验。「配置页只支持 PC」的真实含义是「不想为它写手机样式」，不是「窗口必须够宽」。

- 每个路由 `meta.platforms`：`['pc']` / `['mobile']` / `['pc','mobile']`
- 平板归 PC 侧
- PC 外壳顶栏；移动端外壳底部 tab

## 7. URL 管理

```
Category  id  userId  name  sortOrder  createdAt
Link      id  categoryId  name  url  icon?  note?  sortOrder
          clickCount  lastClickedAt  createdAt
```

固定两层，不做嵌套。

**展示页** `/nav`，双端：
- 所有分类一次性平铺，不做 tab 切换 —— 导航页的价值就是一屏看全
- `repeat(auto-fill, minmax(...))` 自适应列数
- 新标签页打开
- 顶部前端过滤框（几十条数据不值得走后端）
- **常用区**：`clickCount` Top 8，`navigator.sendBeacon` 上报，**带重置按钮**

**配置页** `/nav/admin`，**仅 PC**：增删改 + 拖拽排序。

**图标**：默认域名首字母色块（按域名哈希出固定底色），`icon` 字段可手填 URL 或 emoji 覆盖。**不做 favicon 抓取** —— 个人效率工具里相当一部分是内网地址，而所有第三方 favicon 服务对内网域名一律抓不到；越是最该收录的链接，自动抓取越指望不上。升级路径通畅：以后加「自动获取图标」按钮写进同一字段即可。

**接口**：`GET /nav/tree` 一次返回整树，不分页；分类/链接各自 POST/PATCH/DELETE；`PATCH /nav/order` 批量提交顺序；`POST /nav/links/:id/click` 上报。

**不做**：链接有效性检测、公开分享、书签导入、分类嵌套。

### 已知取舍：累加计数不衰减

`clickCount` 永不衰减，三个月前集中用过的链接会永久霸占常用区。**用「重置统计」按钮手动绕过**，不引入事件表。

放弃的方案：事件表（准确、能长出使用报告，代价是只增不减的表 + 清理策略）；时间衰减评分（一个字段解决衰减，代价是排序结果无法解释）。

## 8. weather 搬迁

源：`/home/huangyingming/test-code/weather-app`。`gemini-version/` 不搬。

**后端**（1432 行代码 + 2196 行测试，一并搬）
- 复制 `weather/`、`geo/`、`config/`，注册进 `app.module.ts`
- **缓存与限流从进程内换成 Redis**。provider 代码不动，只换 store。换来：解除 weather-app 的「不能开 cluster 或多实例」约束、reload 不丢缓存
- 保留双档 TTL（任意一家成功 1800s / 全部失败 60s）与「坐标四舍五入到 2 位小数」的缓存 key（抵消 GPS 抖动）
- Redis 有 maxmemory policy，原本的 LRU 条目上限不再需要
- API 凭据（和风 host+key、彩云 token）直接复用现有值，无需重新申请

**前端**
- `App.vue` 降级为 `WeatherPage.vue` 纳入路由（原项目完全没用 vue-router，直接 mount）
- **样式作用域从 `:root` 降到 `.weather-page`**，`data-daypart` 写页面根节点而非 `documentElement`。组件 scoped style 一行不动（它们只引用 `var()`，变量定义在哪个祖先上都行）
- **保留昼夜换色皮肤 + 全屏沉浸，外壳让位**。理由见其 style.css 原注释：「天气应用的配色是内容的一部分（它在表达外面现在什么样），不是界面外壳偏好」
- **删除 `types/weather.ts`、`types/location.ts` 两份手抄副本，合并进 `packages/shared`**

**文档冲突须 flag**：`docs/adr/0001-hand-rolled-svg-charts.md` 的论证写的是 `:root[data-daypart]`。作用域降级**不推翻该决定**（CSS 变量照样继承到 SVG，手写 SVG 的理由仍成立），但措辞会过时，搬迁时更新为 `.weather-page[data-daypart]`。

## 9. 领域文档：多上下文

根 `CONTEXT-MAP.md` + `docs/contexts/<name>/{CONTEXT.md, adr/}`。

偏离 `docs/agents/domain.md` 描述的 `src/<context>/` 布局，因为 workspaces 下一个上下文横跨 `apps/api` 与 `apps/web`，没有单一目录可放。**须同步更新 domain.md。**

理由：单一 CONTEXT.md 会烂掉 —— weather 的术语（分歧 / 数据源失败 / 字段缺失，且规定了要避免的说法）与 URL 管理完全不相干，每加一个工具再塞一套，最后没人读得完。

`AGENTS.md` 项目名现为 `qnbrower`（模板残留），改为 h5tools；weather-app 的 CLAUDE.md 内容拆分并入：通用约定进 AGENTS.md，天气专属的坑进天气上下文文档。

## 10. 测试：接住搬来的标准，但打折

weather 后端 1432 行代码配 2196 行测试（1.5:1）。若新模块不测，仓库会陷入「一半有测试一半没有」—— 而那种状态的结局通常是有测试的那一半也慢慢烂掉。

- **后端**：每接口一条契约测试（沿用 `*.e2e.spec.ts` 命名），真实 HTTP 打入断言响应结构；业务逻辑写单测。**用真实 Postgres 测试库 + 每用例事务回滚，不 mock Prisma** —— mock 掉的测试证明不了 SQL 是对的
- **前端**：只测纯函数与 store；组件测试**只搬不增**（weather 那几个有真实逻辑的留着；URL 的 CRUD 表单不补）
- 不设覆盖率门槛

## 11. 部署

- 子域名 + 端口，**根路径**，HTTPS
- 占位值：站点 `https://tools.example.com:8443/`，后端进程 `127.0.0.1:3100`，接口 `/api/`
- 外部依赖复用部署机现有的 Postgres / Redis / nginx，均不重复部署
- Postgres 新建 `h5tools` 与 `h5tools_test` 两库 + 专用账号

**HTTPS 是硬需求**：浏览器 Geolocation API 只在安全上下文可用，`http://` + 非 localhost 一律静默拒绝，天气页的自动定位会废掉。

**base path 是构建时的**：`VITE_BASE_PATH` 默认 `/`，router base 共用同一值。改路径必须重新 build。真运行时方案（`base:'./'` + 注入 `<base href>` + 读 `document.baseURI`）的复杂度只在「同一产物部署到多个路径」时才划算，此处不适用。

换域名或端口只需改两处：nginx 的 `listen`/`server_name`，`apps/api/.env` 的 `APP_ORIGIN`。**前端无需重新构建** —— 同域 + `/api` 相对路径，代码里没有任何写死的域名端口。

**开发机上没有 Postgres 和 nginx**（`docker ps` 仅见他人的 redis/mysql 容器）。部署环境是另一台机器。因此开发期需在本机起自用的 PG + Redis 容器，只绑 `127.0.0.1` 高端口，避开他人容器占用的 20380/20381。

继承自 weather-app 的硬约束：
- **Node >= 22.14**（22.13.x 上 `nest start` 抛 `ERR_REQUIRE_CYCLE_MODULE`）
- **后端是 ESM，相对导入必须带 `.js` 扩展名**
- 契约测试命名用 `*.e2e.spec.ts`（`npm test` 匹配 `**/*.spec.ts` 会跑到它）

## 12. 实施顺序

1. **骨架 + 登录 -> 立刻上线**（空站，只有登录页）
2. **URL 管理**
3. **weather 搬迁**
4. 301 切换，旧站下线

先上线的理由：部署链路是最容易拖到最后一次性爆炸的地方。子域名解析、证书、nginx 反代、内网 PG/Redis 连通、`Secure` cookie、`trust proxy` 取到的 IP —— 这六件事任何一件出问题，症状都是「登不上去」。在只有登录页时排查，比三个功能堆上去后排查容易一个数量级。且这些**只能在真实环境验证**，localhost 一件都测不出来（localhost 本身是安全上下文，`Secure` cookie 照样种得上，`trust proxy` 根本不生效）。

URL 管理排在 weather 前的理由：它是全新代码，做完就把「在这个仓库里加一个功能」的完整路径走通了（Prisma model -> shared 类型 -> 后端 module -> 双端展示页 -> PC-only 配置页），**这条路径就是以后每个工具的模板**；weather 走的是搬迁路径，立不了模板。且旧 weather 仍在线上可用，最不急。
