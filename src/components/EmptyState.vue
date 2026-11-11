<script setup lang="ts">
import { state } from "../lib/speaker";
import AppIcon from "./AppIcon.vue";
defineProps<{ icon?: string; title?: string; description?: string }>();
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon"><AppIcon :name="icon || 'speaker'" :size="36" /></div>
    <h2>{{ title || "连接你的 R1 音箱" }}</h2>
    <p>{{ description || "在同一网络下连接设备，音乐与日常控制都在这里。" }}</p>
    <md-filled-button @click="state.connectionDialog = true"
      ><AppIcon slot="icon" name="plus" :size="18" />连接音箱</md-filled-button
    >
  </div>
</template>
