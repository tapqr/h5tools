import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

/**
 * 每个路由用 meta.platforms 声明它适配哪些端。
 *
 * 「端」是设备类型(UA + pointer: coarse 判定一次),不是视口宽度 ——
 * 若按视口宽度判,PC 上把窗口拖窄会让仅-PC 页面突然变成「不支持」,
 * 那是纯粹的 bug 体验。视口断点只负责双端页面内部怎么排版。
 * 判定逻辑与守卫在 issue 06 接入。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: { platforms: ['pc', 'mobile'] },
  },
];

export const router = createRouter({
  // base 与 vite.config.ts 的 base 共用同一个变量。只此一处。
  history: createWebHistory(import.meta.env.VITE_BASE_PATH || '/'),
  routes,
});
