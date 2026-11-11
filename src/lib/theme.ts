import { computed, nextTick, ref, watch } from "vue";
import { load, save } from "./storage";
import { revealTheme, type ThemeOrigin } from "./theme-reveal";
import { findColorScheme, type ColorSchemeId } from "./color-schemes";
import speakerIcon from "@material-symbols/svg-400/outlined/speaker.svg?raw";

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
const colorId = ref<ColorSchemeId>(findColorScheme(load<unknown>("color-scheme", "green")).id);
const colorScheme = computed(() => findColorScheme(colorId.value));
const media = matchMedia("(prefers-color-scheme: dark)");
const systemDark = ref(media.matches);
const transitioning = ref(false);
// This singleton is shared by the toolbar and settings for the app lifetime.
media.addEventListener("change", (event) => (systemDark.value = event.matches));
const isDark = computed(
  () => mode.value === "dark" || (mode.value === "system" && systemDark.value),
);
watch(
  [mode, isDark, colorScheme],
  () => {
    const root = document.documentElement;
    const palette = isDark.value ? colorScheme.value.dark : colorScheme.value.light;
    root.dataset.theme = isDark.value ? "dark" : "light";
    root.dataset.colorScheme = colorScheme.value.id;
    for (const [name, value] of Object.entries(palette)) root.style.setProperty(name, value);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", palette["--bg"]);
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      const svg = speakerIcon.replace("<svg ", `<svg fill="${palette["--accent"]}" `);
      favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }
    save("theme", mode.value);
    save("color-scheme", colorScheme.value.id);
  },
  { immediate: true, flush: "sync" },
);

export function themeOrigin(event: Event): ThemeOrigin {
  if (event instanceof MouseEvent && event.detail !== 0)
    return { x: event.clientX, y: event.clientY };
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
}

async function changeAppearance(
  nextMode: ThemeMode,
  nextColor: ColorSchemeId,
  origin?: ThemeOrigin,
) {
  if (transitioning.value || (mode.value === nextMode && colorId.value === nextColor)) return;
  const nextDark = nextMode === "dark" || (nextMode === "system" && systemDark.value);
  const sameAppearance = nextDark === isDark.value && colorId.value === nextColor;
  const apply = async () => {
    mode.value = nextMode;
    colorId.value = nextColor;
    await nextTick();
  };
  if (
    !origin ||
    sameAppearance ||
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

function setMode(next: ThemeMode, origin?: ThemeOrigin) {
  return changeAppearance(next, colorId.value, origin);
}

function setColorScheme(next: ColorSchemeId, origin?: ThemeOrigin) {
  return changeAppearance(mode.value, next, origin);
}

function cycle(origin: ThemeOrigin) {
  const index = themes.findIndex((theme) => theme.id === mode.value);
  return setMode(themes[(index + 1) % themes.length].id, origin);
}

export function useTheme() {
  return {
    mode: computed(() => mode.value),
    isDark,
    colorScheme,
    isTransitioning: computed(() => transitioning.value),
    setMode,
    setColorScheme,
    cycle,
  };
}
