<script setup lang="ts">
import AppIcon from "./AppIcon.vue";
import AppSlider from "./AppSlider.vue";
import { key, state, volume } from "../lib/speaker";
import { sliderPercent } from "../lib/slider-values";

withDefaults(defineProps<{ id?: string; label?: string; showLabel?: boolean }>(), {
  label: "音量",
});
</script>

<template>
  <div class="volume-row">
    <AppIcon name="volume" class="volume-icon" />
    <span v-if="showLabel" class="volume-label">{{ label }}</span>
    <md-icon-button aria-label="音量减一档" @click="key(25)"
      ><AppIcon name="minus" :size="20"
    /></md-icon-button>
    <AppSlider
      :id="id"
      :aria-label="label"
      drag-only
      :format-value="(value) => sliderPercent(value, state.music.maxVolume)"
      :min="0"
      :max="state.music.maxVolume"
      :value="state.music.volume"
      @change="volume(Number(($event.target as HTMLInputElement).value))"
    />
    <md-icon-button aria-label="音量加一档" @click="key(24)"
      ><AppIcon name="plus" :size="20"
    /></md-icon-button>
    <span class="volume-percent">{{
      sliderPercent(state.music.volume, state.music.maxVolume)
    }}</span>
  </div>
</template>
