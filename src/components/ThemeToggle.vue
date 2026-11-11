<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "./AppIcon.vue";
import { themeOrigin, themes, useTheme } from "../lib/theme";

const { mode, isTransitioning, cycle } = useTheme();
const current = computed(() => themes.find((theme) => theme.id === mode.value)!);

function changeTheme(event: MouseEvent) {
  void cycle(themeOrigin(event));
}
</script>

<template>
  <md-icon-button
    id="theme-toggle"
    :aria-label="current.label"
    :title="current.label"
    :aria-busy="isTransitioning || undefined"
    @click="changeTheme"
    ><AppIcon :name="current.icon"
  /></md-icon-button>
</template>
