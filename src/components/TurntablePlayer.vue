<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import AppIcon from "./AppIcon.vue";
import MaterialState from "./MaterialState.vue";
import { parkedTonearmAngle, tonearmAngle } from "../lib/turntable";
import recordImage from "../../upstream/original/newui/images/disc-ip6.png";
import needleImage from "../../upstream/original/newui/images/needle-ip6.png";

const props = defineProps<{
  cover: string;
  title: string;
  artist: string;
  trackId: string;
  playing: boolean;
  position: number;
  duration: number;
}>();
const loaded = ref(false);
const failed = ref(false);
const viewerOpen = ref(false);
const viewer = ref<HTMLDialogElement>();
const canZoom = computed(() => Boolean(props.cover) && loaded.value && !failed.value);
const ended = computed(() => props.duration > 0 && props.position >= props.duration);
const rotating = computed(() => props.playing && !ended.value);
const needleAngle = computed(() =>
  rotating.value ? tonearmAngle(props.position, props.duration) : parkedTonearmAngle,
);

function openCover() {
  if (!canZoom.value || !viewer.value || viewer.value.open) return;
  viewerOpen.value = true;
  viewer.value.showModal();
}
function closeCover() {
  viewer.value?.close();
}
function artworkLoaded(event: Event) {
  if ((event.target as HTMLImageElement).src === props.cover) loaded.value = true;
}
function artworkFailed(event: Event) {
  if ((event.target as HTMLImageElement).src !== props.cover) return;
  loaded.value = false;
  failed.value = true;
  closeCover();
}
watch(
  () => props.cover,
  () => {
    loaded.value = false;
    failed.value = false;
    closeCover();
  },
);
watch(() => props.trackId, closeCover);
onBeforeUnmount(closeCover);
</script>

<template>
  <div class="turntable" :class="{ 'is-playing': rotating }">
    <div class="turntable-disc">
      <button
        class="turntable-cover"
        :disabled="!canZoom"
        aria-label="放大当前歌曲封面"
        @click="openCover"
      >
        <div :key="trackId" class="turntable-rotor">
          <img
            v-if="cover && !failed"
            :key="cover"
            :src="cover"
            alt="当前歌曲封面"
            referrerpolicy="no-referrer"
            draggable="false"
            @load="artworkLoaded"
            @error="artworkFailed"
          />
          <div v-else class="turntable-placeholder">
            <AppIcon name="music" :size="48" /><span>R1 Control</span>
          </div>
        </div>
        <MaterialState :disabled="!canZoom" />
      </button>
      <img class="turntable-texture" :src="recordImage" alt="" draggable="false" />
      <div
        class="turntable-needle"
        :style="{
          backgroundImage: `url(${needleImage})`,
          transform: `rotate(${needleAngle}deg)`,
        }"
        aria-hidden="true"
      ></div>
    </div>
  </div>
  <dialog
    ref="viewer"
    class="cover-viewer"
    aria-label="歌曲封面大图"
    @click.self="closeCover"
    @close="viewerOpen = false"
  >
    <md-icon-button class="cover-viewer-close" aria-label="关闭封面大图" @click="closeCover">
      <AppIcon name="close" />
    </md-icon-button>
    <figure v-if="viewerOpen" class="cover-viewer-content">
      <img
        :src="cover"
        :alt="`${title || '当前歌曲'}的完整封面`"
        referrerpolicy="no-referrer"
        @error="artworkFailed"
      />
      <figcaption>
        {{ title || "当前歌曲" }}<template v-if="artist"> · {{ artist }}</template>
      </figcaption>
    </figure>
  </dialog>
</template>

<style scoped>
.turntable {
  position: relative;
  width: 100%;
  aspect-ratio: 400 / 480;
  isolation: isolate;
}
.turntable-disc {
  position: absolute;
  left: 5.5%;
  top: 23.75%;
  width: 89%;
  aspect-ratio: 1;
}
.turntable-cover {
  position: absolute;
  z-index: 1;
  left: 18.918919%;
  top: 18.918919%;
  width: 62.162162%;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--soft);
  cursor: zoom-in;
}
.turntable-cover:disabled {
  opacity: 1;
  cursor: default;
}
.turntable-rotor {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  animation: record-spin 30s linear infinite;
  animation-play-state: paused;
}
.is-playing .turntable-rotor {
  animation-play-state: running;
}
.turntable-rotor img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.turntable-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  color: var(--accent);
}
.turntable-placeholder span {
  font: var(--type-label-medium);
  opacity: 0.7;
}
.turntable-texture {
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.turntable-needle {
  position: absolute;
  z-index: 3;
  left: 44.932432%;
  top: -23.648649%;
  width: 32.432432%;
  height: 46.283784%;
  background-repeat: no-repeat;
  background-size: contain;
  /* The actual hinge is at (55, 42) in the 288x411 source image. */
  transform-origin: 19.097222% 10.218978%;
  transition: transform 0.5s linear;
  filter: drop-shadow(1px 2px 4px #0003);
  pointer-events: none;
}
.cover-viewer {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: max(80px, env(safe-area-inset-top)) 24px max(32px, env(safe-area-inset-bottom));
  border: 0;
  background: transparent;
  color: #e0e4de;
  overflow: auto;
  overscroll-behavior: contain;
}
.cover-viewer[open] {
  display: grid;
  place-items: center;
}
.cover-viewer::backdrop {
  background: #080c0bd9;
  backdrop-filter: blur(10px);
}
.cover-viewer-close {
  position: fixed;
  top: max(16px, env(safe-area-inset-top));
  right: max(20px, env(safe-area-inset-right));
  background: #333b37;
  border-radius: 50%;
  --md-sys-color-on-surface-variant: #e0e4de;
}
.cover-viewer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  max-width: 100%;
  margin: 0;
}
.cover-viewer-content img {
  display: block;
  width: auto;
  height: auto;
  max-width: min(900px, 100%);
  max-height: 74dvh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 16px 80px #0009;
}
.cover-viewer-content figcaption {
  max-width: 80vw;
  text-align: center;
  overflow-wrap: anywhere;
  font: var(--type-body-large);
}
@keyframes record-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .turntable-rotor {
    animation: none;
  }
  .turntable-needle {
    transition: none;
  }
}
</style>
