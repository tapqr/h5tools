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
      /*
       * 固定端口 + strictPort。
       *
       * 这台机器是共享的，5173/5174/5175 都被别人的应用占着。
       * Vite 默认撞了端口就**静默顺延**到下一个 —— 调试时曾因此
       * 把请求打到了别人的站点上，页面标题都不是自己的还找了半天。
       * strictPort 让它撞了就报错，宁可起不来也不要起在一个你以为不是的地方。
       */
      port: 5273,
      strictPort: true,
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
