import type { RouteRecordRaw } from 'vue-router';
import type { Platform } from '../platform/detect';

declare module 'vue-router' {
  interface RouteMeta {
    /** 这个页面适配哪些端。缺省视为两端都适配。 */
    platforms?: Platform[];
    /** 不需要登录。默认全部需要。 */
    public?: boolean;
    /** 导航入口。不填则不出现在导航里。 */
    nav?: { title: string; icon: string; order: number };
    /**
     * 让外壳让位，页面自己占满整屏。
     * 天气页会用到 —— 它有一整套随昼夜变色的沉浸式皮肤。
     */
    fullBleed?: boolean;
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { public: true, platforms: ['pc', 'mobile'], fullBleed: true },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: { platforms: ['pc', 'mobile'], nav: { title: '首页', icon: '⌂', order: 1 } },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/SettingsPage.vue'),
    // 只适配 PC —— 配置类页面不为手机写样式
    meta: { platforms: ['pc'], nav: { title: '配置', icon: '⚙', order: 90 } },
  },
  {
    path: '/unsupported',
    name: 'unsupported',
    component: () => import('../pages/UnsupportedPage.vue'),
    meta: { public: true, platforms: ['pc', 'mobile'], fullBleed: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../pages/NotFoundPage.vue'),
    meta: { public: true, platforms: ['pc', 'mobile'] },
  },
];

/** 某个路由是否适配某个端 */
export function supportsPlatform(
  platforms: Platform[] | undefined,
  platform: Platform,
): boolean {
  return !platforms || platforms.includes(platform);
}
