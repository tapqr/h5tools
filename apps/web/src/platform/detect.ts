export type Platform = 'pc' | 'mobile';

export interface PlatformSignals {
  userAgent: string;
  /** matchMedia('(pointer: coarse)') 的结果 */
  coarsePointer: boolean;
}

/** 手机 UA。注意 Android 平板的 UA 里**没有** Mobile 这个词，正好借此与手机区分。 */
const PHONE_UA = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i;

/** 平板 UA。iPadOS 13 起 Safari 默认伪装成 Macintosh，只能靠触屏信号兜住。 */
const TABLET_UA = /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Silk/i;

/**
 * 判定「端」。
 *
 * ## 这里刻意不看视口宽度
 *
 * 「端」是设备类型，不是窗口大小。若按宽度判，在 PC 上把浏览器窗口拖窄到
 * 900px，仅-PC 的页面会**突然变成「不支持，请用手机」** —— 那是纯粹的 bug 体验。
 * 「配置页只支持 PC」的真实含义是「不想为它写手机样式」，不是「窗口必须够宽」。
 * 窄窗口让它横向滚动就行。
 *
 * 视口宽度只负责另一件事：那些「两端都适配」的页面内部怎么排版（CSS 断点）。
 * 两个概念不共用一个判据。
 *
 * ## 平板归 PC 侧
 *
 * iPad 横屏有 1024px 宽，放得下 PC 布局；强行给它底部 tab 反而别扭。
 */
export function detectPlatform({ userAgent, coarsePointer }: PlatformSignals): Platform {
  if (TABLET_UA.test(userAgent)) return 'pc';

  // iPadOS 13+ 伪装成 Macintosh：桌面 UA + 触屏 = 平板，不是 Mac
  if (/Macintosh/i.test(userAgent) && coarsePointer) return 'pc';

  if (PHONE_UA.test(userAgent)) return 'mobile';

  // 没有任何手机特征的触屏设备（触屏一体机、某些 Windows 平板）留在 PC 侧：
  // 宁可给它 PC 布局（能用，只是不够顺手），也不要把一台大屏设备塞进
  // 单列的手机布局里。
  return 'pc';
}

/** 从浏览器读出判定所需的信号 */
export function readPlatformSignals(): PlatformSignals {
  return {
    userAgent: navigator.userAgent,
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
  };
}
