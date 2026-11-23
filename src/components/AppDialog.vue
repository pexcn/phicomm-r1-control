<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { MdDialog } from "@material/web/dialog/dialog.js";
import AppIcon from "./AppIcon.vue";

defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{ mode?: "basic" | "adaptive" | "sheet"; describeContent?: boolean }>(),
  { mode: "basic" },
);
const dialog = ref<MdDialog>();
// Keep the background locked until the closing animation finishes.
const modalActive = ref(false);
const mobileQuery = window.matchMedia("(max-width: 760px)");
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobile = ref(mobileQuery.matches);
const reducedMotion = ref(motionQuery.matches);
const fullscreen = computed(() => props.mode === "adaptive" && mobile.value);
function mediaChanged() {
  mobile.value = mobileQuery.matches;
  reducedMotion.value = motionQuery.matches;
}
mobileQuery.addEventListener("change", mediaChanged);
motionQuery.addEventListener("change", mediaChanged);
onBeforeUnmount(() => {
  mobileQuery.removeEventListener("change", mediaChanged);
  motionQuery.removeEventListener("change", mediaChanged);
});
function dismiss() {
  dialog.value?.shadowRoot
    ?.querySelector("dialog")
    ?.dispatchEvent(new Event("cancel", { cancelable: true }));
}
function opened() {
  modalActive.value = true;
  if (!props.describeContent) return;
  const native = dialog.value?.shadowRoot?.querySelector("dialog");
  const content = native?.querySelector<HTMLElement>(".content");
  if (!native || !content) return;
  // Resolve the description within the native dialog's shadow root.
  content.id = "dialog-description";
  native.setAttribute("aria-describedby", content.id);
}
onMounted(() => {
  const control = dialog.value;
  if (!control) return;
  const open = control.getOpenAnimation.bind(control);
  const close = control.getCloseAnimation.bind(control);
  function transition(opening: boolean): ReturnType<MdDialog["getOpenAnimation"]> {
    const native = control!.shadowRoot?.querySelector("dialog");
    const presentation = native ? getComputedStyle(native) : null;
    const current = presentation?.transform ?? "none";
    const rest = current === "none" ? "translateY(0)" : current;
    const offscreen = props.mode === "sheet" ? "translateY(100%)" : "translateY(24px)";
    const duration = opening ? 300 : 200;
    const easing = presentation
      ?.getPropertyValue(
        opening
          ? "--md-sys-motion-easing-emphasized-decelerate"
          : "--md-sys-motion-easing-emphasized-accelerate",
      )
      .trim();
    return {
      dialog: [
        [
          [
            {
              transform: opening ? offscreen : rest,
              opacity: opening ? 0 : (presentation?.opacity ?? 1),
            },
            { transform: opening ? "translateY(0)" : offscreen, opacity: opening ? 1 : 0 },
          ],
          { duration, easing: easing || undefined },
        ],
      ],
      scrim: [
        [
          [{ opacity: opening ? 0 : 0.32 }, { opacity: opening ? 0.32 : 0 }],
          { duration, easing: opening ? "ease-out" : "ease-in" },
        ],
      ],
    };
  }
  control.getOpenAnimation = () =>
    props.mode === "sheet" || fullscreen.value ? transition(true) : open();
  control.getCloseAnimation = () =>
    props.mode === "sheet" || fullscreen.value ? transition(false) : close();
});
</script>

<template>
  <Teleport to="body">
    <md-dialog
      ref="dialog"
      v-bind="$attrs"
      :data-modal-active="modalActive ? '' : undefined"
      :quick="reducedMotion || $attrs.quick === true"
      :class="{ 'dialog-fullscreen': fullscreen, 'dialog-sheet': mode === 'sheet' }"
      @open="opened"
      @closed="modalActive = false"
    >
      <div slot="headline" class="app-dialog-heading">
        <md-icon-button
          v-if="fullscreen"
          :aria-label="`关闭${$attrs['aria-label'] || '窗口'}`"
          @click="dismiss"
          ><AppIcon name="close"
        /></md-icon-button>
        <div class="app-dialog-title"><slot name="headline" /></div>
      </div>
      <slot />
    </md-dialog>
  </Teleport>
</template>
