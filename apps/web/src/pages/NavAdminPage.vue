<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { NavCategory, NavLink } from '@h5tools/shared';
import { useNavStore } from '../stores/nav';
import { move, moveLink, toReorderRequest } from '../nav/reorder';
import { ApiError } from '../api/client';
import LinkIcon from '../components/LinkIcon.vue';

const nav = useNavStore();
const error = ref('');

onMounted(() => {
  if (!nav.loaded) void nav.load();
});

/** 拖拽期间用本地副本，放手时才整份提交 —— 拖一下发一次请求会很卡 */
const draft = ref<NavCategory[] | null>(null);
const categories = computed(() => draft.value ?? nav.tree.categories);

type Drag =
  | { kind: 'category'; id: string }
  | { kind: 'link'; id: string }
  | null;
const dragging = ref<Drag>(null);

async function commit(next: NavCategory[]) {
  draft.value = next;
  try {
    await nav.reorder(toReorderRequest(next));
  } finally {
    // 无论成败都回到服务端的真相，别让界面停在一个乐观的假象上
    draft.value = null;
  }
}

function onCategoryDrop(targetIndex: number) {
  const d = dragging.value;
  dragging.value = null;
  if (d?.kind !== 'category') return;
  const list = categories.value;
  const from = list.findIndex((c) => c.id === d.id);
  if (from === -1 || from === targetIndex) return;
  void commit(move(list, from, targetIndex));
}

function onLinkDrop(categoryId: string, index: number) {
  const d = dragging.value;
  dragging.value = null;
  if (d?.kind !== 'link') return;
  void commit(moveLink(categories.value, d.id, categoryId, index));
}

// --- 增删改 ---

const newCategory = ref('');
async function addCategory() {
  const name = newCategory.value.trim();
  if (!name) return;
  await run(() => nav.createCategory({ name }));
  newCategory.value = '';
}

async function renameCategory(category: NavCategory) {
  const name = prompt('分类名', category.name)?.trim();
  if (!name || name === category.name) return;
  await run(() => nav.updateCategory(category.id, { name }));
}

async function removeCategory(category: NavCategory) {
  const count = category.links.length;
  const msg = count
    ? `删除「${category.name}」？它下面的 ${count} 个链接会一并删除。`
    : `删除「${category.name}」？`;
  if (!confirm(msg)) return;
  await run(() => nav.deleteCategory(category.id));
}

const form = ref<{ categoryId: string; name: string; url: string; icon: string; note: string } | null>(
  null,
);
const editingId = ref<string | null>(null);

function openCreate(categoryId: string) {
  editingId.value = null;
  form.value = { categoryId, name: '', url: '', icon: '', note: '' };
}

function openEdit(link: NavLink) {
  editingId.value = link.id;
  form.value = {
    categoryId: link.categoryId,
    name: link.name,
    url: link.url,
    icon: link.icon ?? '',
    note: link.note ?? '',
  };
}

async function submitForm() {
  const f = form.value;
  if (!f) return;
  const payload = {
    name: f.name.trim(),
    url: f.url.trim(),
    icon: f.icon.trim() || null,
    note: f.note.trim() || null,
  };
  const ok = await run(() =>
    editingId.value
      ? nav.updateLink(editingId.value, payload)
      : nav.createLink({ categoryId: f.categoryId, ...payload }),
  );
  if (ok) form.value = null;
}

async function removeLink(link: NavLink) {
  if (!confirm(`删除「${link.name}」？`)) return;
  await run(() => nav.deleteLink(link.id));
}

async function run(fn: () => Promise<void>): Promise<boolean> {
  error.value = '';
  try {
    await fn();
    return true;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '操作失败，请重试';
    return false;
  }
}

/** 表单里实时预览图标长什么样 */
const previewLink = computed(() =>
  form.value ? { url: form.value.url || 'http://example.com', icon: form.value.icon || null } : null,
);
</script>

<template>
  <div class="admin">
    <header class="admin__head">
      <h1>链接管理</h1>
      <RouterLink class="admin__back" :to="{ name: 'nav' }">← 回到导航</RouterLink>
    </header>

    <p class="admin__hint">拖动分类标题或链接可以调整顺序，链接可以拖到别的分类下。</p>
    <p v-if="error" class="admin__error" role="alert">{{ error }}</p>

    <div class="admin__add">
      <input
        v-model="newCategory"
        placeholder="新建分类…"
        @keyup.enter="addCategory"
      />
      <button type="button" @click="addCategory">添加分类</button>
    </div>

    <p v-if="nav.loading && !nav.loaded">加载中…</p>

    <section
      v-for="(category, ci) in categories"
      :key="category.id"
      class="cat"
      @dragover.prevent
      @drop.prevent="onCategoryDrop(ci)"
    >
      <header
        class="cat__head"
        draggable="true"
        @dragstart="dragging = { kind: 'category', id: category.id }"
      >
        <span class="cat__grip">⠿</span>
        <h2>{{ category.name }}</h2>
        <span class="cat__count">{{ category.links.length }}</span>
        <button type="button" @click="renameCategory(category)">重命名</button>
        <button type="button" @click="removeCategory(category)">删除</button>
        <button type="button" @click="openCreate(category.id)">+ 链接</button>
      </header>

      <ul class="links" @dragover.prevent @drop.prevent.stop="onLinkDrop(category.id, category.links.length)">
        <li
          v-for="(link, li) in category.links"
          :key="link.id"
          class="link"
          draggable="true"
          @dragstart.stop="dragging = { kind: 'link', id: link.id }"
          @dragover.prevent
          @drop.prevent.stop="onLinkDrop(category.id, li)"
        >
          <span class="link__grip">⠿</span>
          <LinkIcon :link="link" :size="28" />
          <span class="link__text">
            <span class="link__name">{{ link.name }}</span>
            <span class="link__url">{{ link.url }}</span>
          </span>
          <span class="link__clicks">{{ link.clickCount }} 次</span>
          <button type="button" @click="openEdit(link)">编辑</button>
          <button type="button" @click="removeLink(link)">删除</button>
        </li>
        <li v-if="category.links.length === 0" class="link link--empty">
          还没有链接，把别的分类的链接拖过来，或者点上面的「+ 链接」
        </li>
      </ul>
    </section>

    <p v-if="!nav.loading && categories.length === 0" class="admin__hint">
      还没有分类。先在上面建一个。
    </p>

    <!-- 链接表单 -->
    <div v-if="form" class="modal" @click.self="form = null">
      <form class="modal__card" @submit.prevent="submitForm">
        <h3>{{ editingId ? '编辑链接' : '新增链接' }}</h3>

        <label>名称<input v-model="form.name" required maxlength="60" /></label>
        <label>
          地址
          <input v-model="form.url" required placeholder="http://jenkins:8080" />
          <small>内网地址也可以，但必须带 http:// 或 https://</small>
        </label>
        <label>
          图标
          <div class="modal__icon">
            <input v-model="form.icon" placeholder="留空则用首字母色块，可填图片地址或 emoji" />
            <LinkIcon v-if="previewLink" :link="previewLink" :size="32" />
          </div>
        </label>
        <label>备注<input v-model="form.note" maxlength="200" /></label>

        <div class="modal__actions">
          <button type="button" @click="form = null">取消</button>
          <button type="submit" class="modal__primary">保存</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/*
 * 这是一个只适配 PC 的页面（meta.platforms: ['pc']）。
 * 刻意不做窄屏适配：PC 上把窗口拖窄时它横向滚动，而不是被判成「不支持」。
 */
.admin {
  padding: 20px 24px 60px;
  min-width: 720px;
  max-width: 1100px;
  margin: 0 auto;
}

.admin__head {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.admin__head h1 {
  font-size: 20px;
  margin: 0;
}

.admin__back {
  color: var(--app-ink-dim);
}

.admin__hint {
  color: var(--app-ink-dim);
  font-size: 13px;
}

.admin__error {
  color: #b42318;
  font-size: 13px;
}

.admin__add {
  display: flex;
  gap: 8px;
  margin: 12px 0 20px;
}

.admin__add input {
  font: inherit;
  padding: 7px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  color: var(--app-ink);
  width: 220px;
}

button {
  font: inherit;
  font-size: 12px;
  padding: 4px 9px;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  background: var(--app-surface);
  color: var(--app-ink-dim);
}

button:hover {
  color: var(--app-ink);
  border-color: var(--app-accent);
}

.cat {
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
  margin-bottom: 14px;
}

.cat__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--app-border);
  cursor: grab;
}

.cat__head h2 {
  font-size: 14px;
  margin: 0;
  flex: 1;
}

.cat__count,
.link__clicks {
  font-size: 12px;
  color: var(--app-ink-dim);
}

.cat__grip,
.link__grip {
  color: var(--app-ink-dim);
  cursor: grab;
  user-select: none;
}

.links {
  list-style: none;
  margin: 0;
  padding: 6px;
  min-height: 44px;
}

.link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
}

.link:hover {
  background: var(--app-bg);
}

.link--empty {
  color: var(--app-ink-dim);
  font-size: 13px;
  justify-content: center;
  padding: 10px;
}

.link__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.link__name {
  font-size: 14px;
}

.link__url {
  font-size: 12px;
  color: var(--app-ink-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.4);
  display: grid;
  place-items: center;
  padding: 20px;
}

.modal__card {
  background: var(--app-surface);
  border-radius: var(--app-radius);
  padding: 20px;
  width: 440px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal__card h3 {
  margin: 0;
  font-size: 16px;
}

.modal__card label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 13px;
  color: var(--app-ink-dim);
}

.modal__card input {
  font: inherit;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-bg);
  color: var(--app-ink);
}

.modal__card small {
  color: var(--app-ink-dim);
  font-size: 11px;
}

.modal__icon {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal__icon input {
  flex: 1;
  min-width: 0;
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.modal__primary {
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: #fff;
  font-size: 13px;
  padding: 7px 16px;
}
</style>
