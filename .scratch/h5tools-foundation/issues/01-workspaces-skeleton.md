# 01 搭建 npm workspaces 骨架

Status: resolved

建立 `apps/web` / `apps/api` / `packages/shared` 三包结构与统一工具链。

## 要做

- 根 `package.json`：`"workspaces": ["apps/*", "packages/*"]`、`"private": true`，脚本 `dev` / `build` / `test` / `lint` 分派到各包
- 根 `.gitignore`、`.editorconfig`、`prettier` 配置
- `packages/shared`：只导出类型，不需要构建产物；`exports` 指向 `src/index.ts`，前后端 tsconfig 直接 path 过去
- `apps/api`：NestJS 12 ESM 骨架（`"type": "module"`），oxlint + vitest
- `apps/web`：Vite + Vue3 + TS + Pinia + vue-router 骨架
- 根 `README.md`：快速开始

## 验收

- `npm install` 在根目录一次装完三包
- `npm run build` 三包都过
- 前端能 `import type { X } from '@h5tools/shared'`，改 shared 里的类型前端立刻飘红

## 注意

- **统一用 npm，禁止 bun**（改 node_modules 属主，共享环境下会丢写权限）
- 后端 ESM：相对导入必须带 `.js` 扩展名
- Node >= 22.14

## Comments

**已完成（2026-09-22）。** 验收通过：改 `packages/shared` 里的字段名，前后端在**增量构建**下同时飘红。

### 踩到并解决的两件事

**1. 系统 npm 装不上这个仓库。** npm 10.9.8 的 arborist 在解析可选 peer 环时崩溃：

```
TypeError: Cannot read properties of null (reading 'edgesOut')
```

触发链是 `@vitejs/devtools-vitest` peer `vitest@*`，而 vitest 把 `@vitest/browser-*`
系列声明为钉死版本的可选 peer，形成跨大版本的环。**这是 npm 自身的 bug，不是依赖冲突。**

试过并**否决**的绕法：
- `--legacy-peer-deps` —— 能装上，但关掉全部 peer 检查，会把真实冲突一起藏起来
- 定向 `overrides` 钉住 `@vitest/browser-*` —— 无效，崩溃点只是前移
- 统一两个 app 的 vitest 版本、把 vitest 提到根 —— 无效

最终解法：**npm >= 12**（12.0.2 全程保留 peer 检查、干净装上）。
`.npmrc` 设了 `engine-strict=true`，让用错版本时失败得有话可说。

**2. 只在 package.json 里依赖 shared，类型保障是假的。**
`vue-tsc -b` 的增量判断不会因为 node_modules 里某个 `.d.ts` 变了就重建 ——
改了 shared 字段名，前端**构建照样通过**。只有 `--force` 才能抓到。

解法：把 `packages/shared` 声明为 **TypeScript 项目引用**（shared 设 `composite: true`，
web 的 tsconfig 加 `references`）。之后 `tsc -b` 知道它是上游，会自动跟着重建。

这条值得记住：**"共享类型包"这件事，光靠包依赖是做不成的。**

### 顺带
- Vite 8 原生支持 tsconfig paths，移除了 `vite-tsconfig-paths` 插件
- `@vue/tsconfig@0.9` 不再提供 `tsconfig.node.json` 预设，改为继承仓库自己的 base
- vite 与 vitest 配置拆成两个文件（`vite` 的 `defineConfig` 类型里没有 `test` 字段）
