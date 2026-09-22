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
    // 各 spec 文件**不能并行**：它们共用同一个测试库和同一个 Redis 库，
    // 用例之间的隔离是靠"清库"做的，并行跑就会出现 A 文件的清库把 B 文件
    // 正在用的数据冲掉 —— 症状是单跑都过、全套跑随机失败。
    // 要恢复并行，得先让每个文件用独立的库，那个代价不值得。
    fileParallelism: false,
  },
});
