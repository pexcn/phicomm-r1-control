<script setup lang="ts">
import MaterialState from "./components/MaterialState.vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import AppIcon from "./components/AppIcon.vue";
import ConnectionDialog from "./components/ConnectionDialog.vue";
import SettingsDialog from "./components/SettingsDialog.vue";
import ThemeToggle from "./components/ThemeToggle.vue";
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

function currentPage(): Page {
  const id = location.hash.replace(/^#\/?/, "");
  return pages.some((page) => page.id === id) ? (id as Page) : "music";
}
const page = ref<Page>(currentPage());
const title = computed(() => pages.find((item) => item.id === page.value)!.label);
const upstreamUrl = new URL("upstream/", document.baseURI).href;

function hashChange() {
  page.value = currentPage();
}
window.addEventListener("hashchange", hashChange);
watch([page, connected], () => readPanel(page.value));
function focusMain() {
  document.getElementById("main-content")?.focus();
}
onBeforeUnmount(() => {
  dispose();
  window.removeEventListener("hashchange", hashChange);
});
</script>

<template>
  <a class="skip-link" href="#main-content" @click.prevent="focusMain">跳到内容</a>
  <aside class="sidebar">
    <a class="brand" href="#/music" aria-label="R1 Control 首页"
      ><MaterialState /><span class="brand-icon"><AppIcon name="speaker" /></span
      ><strong>R1 Control</strong></a
    >
    <nav aria-label="主导航">
      <a
        v-for="item in pages"
        :key="item.id"
        :href="`#/${item.id}`"
        :aria-current="page === item.id ? 'page' : undefined"
        ><MaterialState /><span class="navigation-icon"><AppIcon :name="item.icon" /></span
        ><span>{{ item.label }}</span></a
      >
    </nav>
    <div class="sidebar-footer">
      <button @click="state.settingsDialog = true">
        <MaterialState /><AppIcon name="settings" />设置</button
      ><a :href="upstreamUrl"
        ><MaterialState /><AppIcon name="external" />原作者版本<AppIcon name="arrow" :size="16"
      /></a>
    </div>
  </aside>
  <div class="app-shell">
    <header class="topbar">
      <strong class="topbar-title">{{ title }}</strong
      ><a href="#/music" class="mobile-brand"
        ><MaterialState /><span class="brand-icon"><AppIcon name="speaker" :size="20" /></span>R1
        Control</a
      >
      <div class="topbar-actions">
        <button
          class="connection-chip"
          :class="{ online: connected }"
          @click="state.connectionDialog = true"
          aria-label="选择或连接音箱"
        >
          <MaterialState /> <span class="status-dot"></span
          ><span class="connection-label">{{ connected ? deviceName : connectionLabel }}</span
          ><AppIcon name="down" :size="16" /></button
        ><ThemeToggle /><md-icon-button @click="state.settingsDialog = true" aria-label="打开设置"
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
      ><MaterialState /><span><AppIcon :name="item.icon" /></span>{{ item.label }}</a
    >
  </nav>
  <ConnectionDialog /><SettingsDialog />
  <div v-if="state.toast" class="snackbar" role="status">
    {{ state.toast
    }}<button @click="state.toast = ''" aria-label="关闭提示">
      <MaterialState />
      <AppIcon name="close" :size="18" />
    </button>
  </div>
</template>
