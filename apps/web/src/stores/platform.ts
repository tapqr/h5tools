import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { detectPlatform, readPlatformSignals, type Platform } from '../platform/detect';

/**
 * 「端」判定一次就固定下来，不随窗口变化。
 * 理由见 platform/detect.ts 的注释。
 */
export const usePlatformStore = defineStore('platform', () => {
  const platform = ref<Platform>(detectPlatform(readPlatformSignals()));

  return {
    platform,
    isPc: computed(() => platform.value === 'pc'),
    isMobile: computed(() => platform.value === 'mobile'),
  };
});
