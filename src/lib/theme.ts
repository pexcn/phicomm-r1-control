import { computed, nextTick, ref, watch } from "vue";
import { load, save } from "./storage";
import { revealTheme, type ThemeOrigin } from "./theme-reveal";

export const themes = [
  { id: "system", label: "跟随系统", icon: "system" },
  { id: "light", label: "浅色模式", icon: "sun" },
  { id: "dark", label: "深色模式", icon: "moon" },
] as const;
export type ThemeMode = (typeof themes)[number]["id"];
const stored = load<unknown>("theme", "system");
const mode = ref<ThemeMode>(
  themes.some((theme) => theme.id === stored) ? (stored as ThemeMode) : "system",
);
const media = matchMedia("(prefers-color-scheme: dark)");
const systemDark = ref(media.matches);
const transitioning = ref(false);
// This singleton is shared by the toolbar and settings for the app lifetime.
media.addEventListener("change", (event) => (systemDark.value = event.matches));
const isDark = computed(
  () => mode.value === "dark" || (mode.value === "system" && systemDark.value),
);
watch(
  [mode, isDark],
  () => {
    document.documentElement.dataset.theme = isDark.value ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isDark.value ? "#111318" : "#f4f7f5");
    save("theme", mode.value);
  },
  { immediate: true, flush: "sync" },
);

export function themeOrigin(event: MouseEvent): ThemeOrigin {
  if (event.detail !== 0) return { x: event.clientX, y: event.clientY };
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
}

async function setMode(next: ThemeMode, origin?: ThemeOrigin) {
  if (transitioning.value || mode.value === next) return;
  const nextDark = next === "dark" || (next === "system" && systemDark.value);
  const apply = async () => {
    mode.value = next;
    await nextTick();
  };
  if (
    !origin ||
    nextDark === isDark.value ||
    typeof document.startViewTransition !== "function" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    await apply();
    return;
  }
  transitioning.value = true;
  try {
    await revealTheme(origin, apply);
  } finally {
    transitioning.value = false;
  }
}

function cycle(origin: ThemeOrigin) {
  const index = themes.findIndex((theme) => theme.id === mode.value);
  return setMode(themes[(index + 1) % themes.length].id, origin);
}

export function useTheme() {
  return {
    mode: computed(() => mode.value),
    isDark,
    isTransitioning: computed(() => transitioning.value),
    setMode,
    cycle,
  };
}
