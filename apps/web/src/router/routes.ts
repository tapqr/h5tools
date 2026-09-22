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
  // 打开站点直接进导航页 —— 这个站的主用途就是"打开就点"
  { path: '/', redirect: { name: 'nav' } },
  {
    path: '/nav',
    name: 'nav',
    component: () => import('../pages/NavPage.vue'),
    meta: { platforms: ['pc', 'mobile'], nav: { title: '导航', icon: '⌂', order: 1 } },
  },
  {
    path: '/nav/admin',
    name: 'nav-admin',
    component: () => import('../pages/NavAdminPage.vue'),
    // 只适配 PC：拖拽排序和表单在手机上没法好好用，也不打算为它写一套
    meta: { platforms: ['pc'] },
  },
  {
    path: '/weather',
    name: 'weather',
    component: () => import('../pages/WeatherPage.vue'),
    // 它本来就没有媒体查询：内容锁在 520px 居中列，PC 上就是一条窄列，
    // 这是天气类应用在桌面上的通行做法。两端都适配。
    meta: {
      platforms: ['pc', 'mobile'],
      nav: { title: '天气', icon: '☀', order: 2 },
      // 外壳让位：这一页有一整套随昼夜变色的沉浸式皮肤，罩个顶栏在上面很突兀
      fullBleed: true,
    },
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
