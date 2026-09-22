import { createRouter, createWebHistory } from 'vue-router';
import { routes, supportsPlatform } from './routes';
import { usePlatformStore } from '../stores/platform';
import { useAuthStore } from '../stores/auth';
import { setUnauthorizedHandler } from '../api/client';

export const router = createRouter({
  // base 与 vite.config.ts 的 base 共用同一个变量。只此一处。
  history: createWebHistory(import.meta.env.VITE_BASE_PATH || '/'),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

// 任何接口返回 401 都回到登录页，并记住来路
setUnauthorizedHandler(() => {
  if (router.currentRoute.value.name === 'login') return;
  void router.replace({
    name: 'login',
    query: { redirect: router.currentRoute.value.fullPath },
  });
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const platform = usePlatformStore();

  // 首次进入时先把会话恢复出来再判断，否则刷新页面会闪一下登录页
  if (auth.restoring) {
    await auth.restore();
  }

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // 已登录就别再停在登录页
  if (to.name === 'login' && auth.isAuthenticated) {
    return { path: (to.query.redirect as string) || '/' };
  }

  // 当前端不适配这个页面 -> 给一个说得清楚的提示页，不是白屏也不是 404
  if (!supportsPlatform(to.meta.platforms, platform.platform)) {
    return { name: 'unsupported', query: { page: String(to.name ?? to.path) } };
  }

  return true;
});
