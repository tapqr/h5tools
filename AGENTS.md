# h5tools

个人效率工具站。登录后可用，PC 与移动端**按页面**各自适配。
设计决策与理由见 [`.scratch/h5tools-foundation/spec.md`](.scratch/h5tools-foundation/spec.md)。

## 动手前先读

- 根 [`CONTEXT-MAP.md`](CONTEXT-MAP.md) —— 指向各上下文的术语表与 ADR
- 要改哪块就读哪块的 `docs/contexts/<name>/`

## 这个仓库的硬约定

违反这些会以各种绕弯的方式坏掉，逐条都是踩过的：

| 约定 | 不遵守会怎样 |
|---|---|
| **装依赖用 `npx -y npm@latest install`** | 系统 npm 10.x 的 arborist 解析 vite 8 的可选 peer 环时会崩（`Cannot read properties of null reading 'edgesOut'`）。**不要改用 `--legacy-peer-deps`** —— 那会关掉全部 peer 检查 |
| **不要用 bun** | 会改 `node_modules` 属主与 ACL，共享环境下 claude-svc 会失去写权限 |
| **Node >= 22.14** | 22.13.x 上 `nest start` 抛 `ERR_REQUIRE_CYCLE_MODULE` |
| **后端是 ESM，相对导入必须带 `.js` 扩展名** | 运行时找不到模块。哪怕源文件是 `.ts`，也写 `./foo.js` |
| **前端不写 `.js` 扩展名** | 前端走 bundler 解析，用惯例写法即可。这条与上一条**方向相反**，别搞混 |
| **`packages/shared` 要用 TypeScript 项目引用接入** | 只做包依赖的话，`tsc -b` 会因缓存判定"无需重建"而放过 shared 的类型变更 —— 那份"编译期契约保障"是假的 |
| **Redis 所有 key 必须带前缀，绝不 `flushdb`** | 那是一台**共享**实例，上面有别的项目。清库会清掉别人的数据 |
| **契约测试命名用 `*.e2e.spec.ts`** | 这是刻意的：`npm test` 的 include 是 `src/**/*.spec.ts`，契约测试应该跟着一起跑 |
| **测试文件不并行（`fileParallelism: false`）** | 它们共用同一个测试库，隔离靠清表做的，并行会互相冲掉数据 —— 症状是单跑都过、全套跑随机失败 |
| **`npm test` 通过不等于能构建** | vitest 不做类型检查。两个都要跑 |

## 这是 GitHub 上的**公开仓库**

任何人都能看到这里的每一行代码和每一条历史提交。**历史是抹不掉的** ——
一旦推上去，即使后来删掉，也已经在别人的 clone 和各种镜像里了。

绝不能进版本库的东西：

| 类别 | 例子 |
|---|---|
| 凭据 | API Key、Token、数据库/Redis 密码、私钥、session secret |
| 内网信息 | 内网 IP、内部主机名、内部服务端口、VPN/跳板机地址 |
| 部署细节 | 真实域名、证书路径、服务器路径（能推断出目录结构的） |
| 个人信息 | 真实姓名、邮箱、手机号 |

做法：

- **真实值只进 `apps/api/.env`**（已 gitignore）。`.env.example` 里放占位符，
  且占位符本身不能暴露格式线索（写 `<内网 Redis 地址>`，不要写 `10.0.13.x`）
- **测试桩用文档专用地址**：IP 用 RFC 5737 的 `192.0.2.x`，域名用 `example.com`。
  不要顺手抄一个真实地址进去 —— 这条踩过一次，内网 IP 就是这么进了测试文件的
- **文档里的域名、路径、地址一律占位符**
- **`git add -f` 是禁令。** gitignore 挡住的东西不要强推进去
- 排查问题时不要把 `.env` 的内容 `cat` 到 issue、截图或任何公开的地方

提交前自查（有可疑内容时跑一下）：

```bash
git diff --cached | grep -inE "password|secret|token|api[_-]?key|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\."
```

已知的一次泄漏：内网 Redis IP 曾出现在文档与测试里，历史中约 43 处。
评估后**接受不重写历史**（RFC1918 私有地址、不可路由、不含凭据，
重写一个已公开仓库的全部历史代价更大）。当前文件已清理。

## 安全上不能动的三件事

1. **全局 AuthGuard 默认拒绝。** 放行要显式 `@Public()`。以后加功能忘了鉴权，
   结果是 401（有人来报），不是数据裸奔（没人发现）。
2. **`main.ts` 的 `trust proxy` 不能删。** 线上在 nginx 后面，不设的话按 IP 限流
   会退化成全站共享一个额度 —— 等于没有防爆破。
3. **生产启动守卫不能绕。** admin 还是初始口令就拒绝启动。这个站公网可达。

## Agent skills

### Issue tracker

Issue 与 spec 以 markdown 文件存放在 `.scratch/<feature>/`。See `docs/agents/issue-tracker.md`。

### Triage labels

五个默认规范标签，标签字符串与角色名一致。See `docs/agents/triage-labels.md`。

### Domain docs

**多上下文**：根 `CONTEXT-MAP.md` + `docs/contexts/<name>/`。See `docs/agents/domain.md`。
