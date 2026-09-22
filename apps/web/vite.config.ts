import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // ⚠ base path 是**构建时**写死进产物的,不是运行时配置。
  // 站点从根路径改挂到子路径,改这个变量之后**必须重新 build**,
  // 否则整页资源 404。代码里只有这一处需要改 —— router 的 base 也读它。
  const base = env.VITE_BASE_PATH || '/';

  return {
    base,
    plugins: [vue()],
    server: {
      // 本地开发把 /api 打到后端进程,和生产同域的形态保持一致,
      // 这样前端代码里永远只写 /api 相对路径,不存在写死的域名端口。
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3100',
          changeOrigin: false,
        },
      },
    },
  };
});
