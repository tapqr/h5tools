<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { ApiError } from '../api/client';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const username = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);

async function onSubmit() {
  if (submitting.value) return;
  error.value = '';
  submitting.value = true;
  try {
    await auth.login({ username: username.value, password: password.value });
    // 回到原本要去的地方；没有就回首页
    await router.replace((route.query.redirect as string) || '/');
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = '网络异常，请稍后再试';
    }
    password.value = '';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login">
    <form class="login__card" @submit.prevent="onSubmit">
      <h1 class="login__title">h5tools</h1>
      <p class="login__sub">个人效率工具站</p>

      <label class="login__field">
        <span>账号</span>
        <input
          v-model="username"
          type="text"
          autocomplete="username"
          autocapitalize="off"
          autocorrect="off"
          required
        />
      </label>

      <label class="login__field">
        <span>密码</span>
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>

      <p v-if="error" class="login__error" role="alert">{{ error }}</p>

      <button class="login__submit" type="submit" :disabled="submitting">
        {{ submitting ? '登录中…' : '登录' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 手机上留出安全区，别把卡片顶到刘海下面 */
  padding: calc(env(safe-area-inset-top, 0px) + 24px) 20px 24px;
}

.login__card {
  width: 100%;
  max-width: 360px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login__title {
  font-size: 22px;
  margin: 0;
}

.login__sub {
  margin: -12px 0 4px;
  color: var(--app-ink-dim);
  font-size: 13px;
}

.login__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--app-ink-dim);
}

.login__field input {
  font: inherit;
  /* 16px 以下 iOS Safari 会在聚焦时放大整个页面 */
  font-size: 16px;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-bg);
  color: var(--app-ink);
}

.login__field input:focus {
  outline: 2px solid var(--app-accent);
  outline-offset: -1px;
}

.login__error {
  margin: 0;
  color: #b42318;
  font-size: 13px;
}

.login__submit {
  margin-top: 4px;
  padding: 11px;
  border: none;
  border-radius: 8px;
  background: var(--app-accent);
  color: #fff;
  font-size: 15px;
}

.login__submit:disabled {
  opacity: 0.6;
}
</style>
