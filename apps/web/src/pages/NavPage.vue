<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { NavLink } from '@h5tools/shared';
import { useNavStore } from '../stores/nav';
import { usePlatformStore } from '../stores/platform';
import { filterTree, topLinks } from '../nav/link-display';
import LinkIcon from '../components/LinkIcon.vue';

const nav = useNavStore();
const platform = usePlatformStore();
const query = ref('');

onMounted(() => {
  if (!nav.loaded) void nav.load();
});

const categories = computed(() => filterTree(nav.tree, query.value));
// 过滤时不显示常用区 —— 用户在找特定东西，一排"常用"只是噪音
const top = computed(() => (query.value.trim() ? [] : topLinks(nav.tree, 8)));

function onOpen(link: NavLink) {
  nav.reportClick(link);
}

async function onReset() {
  if (!confirm('把所有链接的点击次数清零？「常用」区会重新开始统计。')) return;
  await nav.resetStats();
}
</script>

<template>
  <div class="nav">
    <div class="nav__bar">
      <input
        v-model="query"
        class="nav__search"
        type="search"
        placeholder="过滤链接…"
        autocapitalize="off"
        autocorrect="off"
      />
      <RouterLink v-if="platform.isPc" class="nav__manage" :to="{ name: 'nav-admin' }">
        管理
      </RouterLink>
    </div>

    <p v-if="nav.loading && !nav.loaded" class="nav__status">加载中…</p>

    <template v-else-if="nav.isEmpty">
      <div class="nav__empty">
        <p>还没有任何链接。</p>
        <p v-if="platform.isPc">
          去<RouterLink :to="{ name: 'nav-admin' }">管理页</RouterLink>添加。
        </p>
        <p v-else>管理页只支持电脑访问，请用电脑添加链接。</p>
      </div>
    </template>

    <template v-else>
      <section v-if="top.length" class="group">
        <header class="group__head">
          <h2>常用</h2>
          <button class="group__reset" type="button" @click="onReset">重置统计</button>
        </header>
        <div class="grid">
          <a
            v-for="link in top"
            :key="`top-${link.id}`"
            class="card"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            @click="onOpen(link)"
          >
            <LinkIcon :link="link" />
            <span class="card__text">
              <span class="card__name">{{ link.name }}</span>
              <span class="card__note">{{ link.clickCount }} 次</span>
            </span>
          </a>
        </div>
      </section>

      <section v-for="category in categories" :key="category.id" class="group">
        <header class="group__head">
          <h2>{{ category.name }}</h2>
        </header>
        <div class="grid">
          <a
            v-for="link in category.links"
            :key="link.id"
            class="card"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            :title="link.note ?? link.url"
            @click="onOpen(link)"
          >
            <LinkIcon :link="link" />
            <span class="card__text">
              <span class="card__name">{{ link.name }}</span>
              <span class="card__note">{{ link.note ?? link.url }}</span>
            </span>
          </a>
        </div>
      </section>

      <p v-if="categories.length === 0" class="nav__status">没有匹配的链接。</p>
    </template>
  </div>
</template>

<style scoped>
.nav {
  padding: 16px 20px 32px;
  /*
   * 1280 是按 1080p 定的，在 2K/4K 上只占三分之一到一半，右边全空着。
   *
   * 封顶放到 2240：2560 宽的屏能铺满（两侧留出 gutter），再宽就在这停住 ——
   * 一行扫过整个 4K 屏不是「一屏看全」，是「一屏找不到」。
   *
   * 另外 4K 显示器多数跑 150%~200% 缩放，CSS 像素其实落在 1920~2560 这段，
   * 真正要覆盖的是它，不是 3840。
   */
  max-width: 2240px;
  margin: 0 auto;
}

.nav__bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
}

.nav__search {
  flex: 1;
  min-width: 0;
  font: inherit;
  /* 16px 以下 iOS Safari 聚焦时会放大整个页面 */
  font-size: 16px;
  padding: 9px 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-ink);
}

.nav__manage {
  flex: none;
  color: var(--app-ink-dim);
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
}

.nav__status,
.nav__empty {
  color: var(--app-ink-dim);
  padding: 24px 0;
}

.nav__empty a {
  color: var(--app-accent);
}

.group {
  margin-bottom: 24px;
}

.group__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.group__head h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-ink-dim);
  margin: 0;
}

.group__reset {
  background: none;
  border: none;
  color: var(--app-ink-dim);
  font-size: 12px;
  padding: 2px 6px;
}

.group__reset:hover {
  color: var(--app-ink);
}

/*
 * 列数自适应，不写断点。
 * PC 宽屏铺满多列，手机自然落成一到两列 —— 这正是"一屏看全"想要的效果。
 *
 * 下限跟着视口长大（180 -> 240）：宽屏上卡片变大，而不是单纯多塞几列。
 * 卡片第二行是 URL，宽一点能多看见一截；纯加列数只会让眼睛横扫得更远。
 * clamp 的下限 180 保证窄屏行为跟以前**完全一致** —— 1280 以下 13vw 都不到 180。
 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(clamp(180px, 13vw, 240px), 1fr));
  gap: 10px;
}

.card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  min-width: 0;
}

.card:hover {
  border-color: var(--app-accent);
}

.card__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card__name {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__note {
  font-size: 12px;
  color: var(--app-ink-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
