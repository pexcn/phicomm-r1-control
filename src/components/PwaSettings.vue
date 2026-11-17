<script setup lang="ts">
import { applyPwaUpdate, checkPwaUpdate, installPwa, pwa } from "../lib/pwa";
</script>

<template>
  <section class="pwa-settings" aria-labelledby="pwa-title">
    <h3 id="pwa-title">安装与更新</h3>
    <p v-if="pwa.installed" class="hint">应用已安装，可从桌面或主屏幕打开。</p>
    <p v-else-if="pwa.canInstall" class="hint">安装后可从桌面或主屏幕打开，使用独立应用窗口。</p>
    <p v-else-if="pwa.supported" class="hint">
      可使用浏览器菜单中的“安装应用”或“添加到主屏幕”。iPhone / iPad 请在 Safari 的分享菜单中操作。
    </p>
    <p v-else class="hint">
      当前环境仅提供网页模式。安装与离线缓存需要 HTTPS，并使用支持的浏览器。
    </p>
    <p class="hint">
      {{
        pwa.offlineReady
          ? "界面离线资源已就绪。"
          : pwa.supported
            ? "首次联网打开后会准备界面离线资源。"
            : ""
      }}控制音箱和获取音乐数据仍需要网络连接。
    </p>
    <p v-if="pwa.updateAvailable" class="hint">
      新版本已准备好。重新加载会短暂断开控制连接，请先完成当前操作。
    </p>
    <p v-if="pwa.message" class="hint" role="status">{{ pwa.message }}</p>
    <div class="pwa-actions">
      <md-filled-tonal-button
        v-if="pwa.canInstall && !pwa.installed"
        :disabled="pwa.installing"
        @click="installPwa"
        >安装应用</md-filled-tonal-button
      >
      <md-text-button v-if="pwa.supported" :disabled="pwa.checking" @click="checkPwaUpdate">{{
        pwa.checking ? "正在检查…" : "检查更新"
      }}</md-text-button>
      <md-filled-tonal-button v-if="pwa.updateAvailable" @click="applyPwaUpdate"
        >更新并重新加载</md-filled-tonal-button
      >
    </div>
  </section>
</template>

<style scoped>
.pwa-settings {
  display: grid;
  gap: 12px;
}
.pwa-settings h3,
.pwa-settings p {
  margin: 0;
}
.pwa-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
</style>
