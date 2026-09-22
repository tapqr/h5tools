import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    // 前端只测纯函数与 store，组件测试只搬不增（spec 第 10 节），
    // 早期没有测试文件是正常状态，不该红。
    passWithNoTests: true,
  },
});
