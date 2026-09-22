<script setup lang="ts">
import { computed } from 'vue';
import type { NavLink } from '@h5tools/shared';
import { iconOf, isImageIcon } from '../nav/link-display';

const props = defineProps<{ link: Pick<NavLink, 'url' | 'icon'>; size?: number }>();

const icon = computed(() => iconOf(props.link));
const px = computed(() => `${props.size ?? 36}px`);
</script>

<template>
  <img
    v-if="icon.custom && isImageIcon(icon.custom)"
    class="icon icon--img"
    :src="icon.custom"
    alt=""
    loading="lazy"
  />
  <span v-else-if="icon.custom" class="icon icon--emoji">{{ icon.custom }}</span>
  <span v-else class="icon icon--initial" :style="{ background: icon.background }">
    {{ icon.initial }}
  </span>
</template>

<style scoped>
.icon {
  width: v-bind(px);
  height: v-bind(px);
  flex: none;
  border-radius: 9px;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.icon--img {
  object-fit: cover;
  background: var(--app-bg);
}

.icon--emoji {
  font-size: calc(v-bind(px) * 0.6);
  background: var(--app-bg);
}

.icon--initial {
  color: #fff;
  font-weight: 600;
  font-size: calc(v-bind(px) * 0.45);
  letter-spacing: 0;
}
</style>
