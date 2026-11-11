<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import AppIcon from "./components/AppIcon.vue";
import ConnectionDialog from "./components/ConnectionDialog.vue";
import SettingsDialog from "./components/SettingsDialog.vue";
import MusicPage from "./views/MusicPage.vue";
import ScreenPage from "./views/ScreenPage.vue";
import SoundPage from "./views/SoundPage.vue";
import BluetoothPage from "./views/BluetoothPage.vue";
import DevicePage from "./views/DevicePage.vue";
import {
  connected,
  connectionLabel,
  deviceName,
  dispose,
  pages,
  readPanel,
  state,
  type Page,
} from "./lib/speaker";
import { save } from "./lib/storage";

function currentPage(): Page {
  const id = location.hash.replace(/^#\/?/, "");
  return pages.some((page) => page.id === id) ? (id as Page) : "music";
}
const page = ref<Page>(currentPage());
const title = computed(() => pages.find((item) => item.id === page.value)!.label);
const themeQuery = matchMedia("(prefers-color-scheme: dark)");
const systemDark = ref(themeQuery.matches);
const dark = computed(
  () => state.theme === "dark" || (state.theme === "system" && systemDark.value),
);
const upstreamUrl = new URL("upstream/", document.baseURI).href;

function hashChange() {
  page.value = currentPage();
}
function systemChange(event: MediaQueryListEvent) {
  systemDark.value = event.matches;
}
window.addEventListener("hashchange", hashChange);
themeQuery.addEventListener("change", systemChange);
watch(
  dark,
  (value) => {
    document.documentElement.dataset.theme = value ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", value ? "#111318" : "#f4f7f5");
  },
  { immediate: true },
);
watch([page, connected], () => readPanel(page.value));
function toggleTheme() {
  state.theme = dark.value ? "light" : "dark";
  save("theme", state.theme);
}
function focusMain() {
  document.getElementById("main-content")?.focus();
}
onBeforeUnmount(() => {
  dispose();
  window.removeEventListener("hashchange", hashChange);
  themeQuery.removeEventListener("change", systemChange);
});
</script>

<template>
  <a class="skip-link" href="#main-content" @click.prevent="focusMain">跳到内容</a>
  <aside class="sidebar">
    <a class="brand" href="#/music" aria-label="R1 Control 首页"
      ><span class="brand-icon"><AppIcon name="speaker" /></span><strong>R1 Control</strong></a
    >
    <nav aria-label="主导航">
      <a
        v-for="item in pages"
        :key="item.id"
        :href="`#/${item.id}`"
        :aria-current="page === item.id ? 'page' : undefined"
        ><AppIcon :name="item.icon" /><span>{{ item.label }}</span></a
      >
    </nav>
    <div class="sidebar-footer">
      <button @click="state.settingsDialog = true"><AppIcon name="settings" />设置</button
      ><a :href="upstreamUrl"
        ><AppIcon name="external" />原作者版本<AppIcon name="arrow" :size="16"
      /></a>
    </div>
  </aside>
  <div class="app-shell">
    <header class="topbar">
      <strong class="topbar-title">{{ title }}</strong
      ><a href="#/music" class="mobile-brand"
        ><span class="brand-icon"><AppIcon name="speaker" :size="20" /></span>R1 Control</a
      >
      <div class="topbar-actions">
        <button
          class="connection-chip"
          :class="{ online: connected }"
          @click="state.connectionDialog = true"
          aria-label="选择或连接音箱"
        >
          <span class="status-dot"></span><span>{{ connected ? deviceName : connectionLabel }}</span
          ><AppIcon name="down" :size="16" /></button
        ><md-icon-button @click="toggleTheme" :aria-label="dark ? '切换浅色模式' : '切换深色模式'"
          ><AppIcon :name="dark ? 'sun' : 'moon'" /></md-icon-button
        ><md-icon-button @click="state.settingsDialog = true" aria-label="打开设置"
          ><AppIcon name="settings"
        /></md-icon-button>
      </div>
    </header>
    <main id="main-content" tabindex="-1">
      <div
        v-if="state.error && !state.connectionDialog"
        role="alert"
        class="notice error error-banner"
      >
        <AppIcon name="info" /><span>{{ state.error }}</span
        ><md-text-button @click="state.connectionDialog = true">检查连接</md-text-button>
      </div>
      <MusicPage v-if="page === 'music'" />
      <ScreenPage v-else-if="page === 'screen'" />
      <SoundPage v-else-if="page === 'sound'" />
      <BluetoothPage v-else-if="page === 'bluetooth'" />
      <DevicePage v-else />
    </main>
  </div>
  <nav class="bottom-nav" aria-label="手机导航">
    <a
      v-for="item in pages"
      :key="item.id"
      :href="`#/${item.id}`"
      :aria-current="page === item.id ? 'page' : undefined"
      ><span><AppIcon :name="item.icon" /></span>{{ item.label }}</a
    >
  </nav>
  <ConnectionDialog /><SettingsDialog />
  <div v-if="state.toast" class="snackbar" role="status">
    {{ state.toast
    }}<button @click="state.toast = ''" aria-label="关闭提示">
      <AppIcon name="close" :size="18" />
    </button>
  </div>
</template>
