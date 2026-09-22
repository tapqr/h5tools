import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    // tests/ 放的是读源文件的结构性测试（需要 node API），
    // 它们归 tsconfig.node.json 管，不让 node 类型渗进应用代码
    include: ['src/**/*.spec.ts', 'tests/**/*.spec.ts'],
    // 前端只测纯函数与 store，组件测试只搬不增（spec 第 10 节），
    // 早期没有测试文件是正常状态，不该红。
    passWithNoTests: true,
  },
});
