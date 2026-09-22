import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Vite 8 起原生支持 tsconfig paths，不再需要 vite-tsconfig-paths 插件
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    // 契约测试沿用搬迁源的命名 `*.e2e.spec.ts`，它会被这条 include 匹配到 ——
    // 这是刻意的，契约测试应该跟着 `npm test` 一起跑。见 AGENTS.md。
    include: ['src/**/*.spec.ts'],
    // 测试连真实 Postgres 的独立测试库（不 mock Prisma）。
    // globalSetup 负责把迁移应用上去，setupFiles 负责把每个测试进程指向测试库。
    globalSetup: ['./vitest.globalSetup.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
