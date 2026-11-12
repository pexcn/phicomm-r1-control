import {
  argbFromHex,
  Hct,
  hexFromArgb,
  MaterialDynamicColors as roles,
  SchemeTonalSpot,
  type DynamicColor,
} from "@material/material-color-utilities";
import { commonTokens, type ColorPalette } from "./color-schemes.ts";

export const defaultCustomColor = "#007a50";

export function normalizeCustomColor(value: unknown): string | null {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim().toLowerCase()
    : null;
}

export function createCustomColorScheme(seed: string) {
  const normalized = normalizeCustomColor(seed);
  if (!normalized) throw new Error("请输入 #RRGGBB 格式的颜色代码。");
  const source = Hct.fromInt(argbFromHex(normalized));
  function palette(dark: boolean): ColorPalette {
    const scheme = new SchemeTonalSpot(source, dark, 0);
    const color = (role: DynamicColor) => hexFromArgb(role.getArgb(scheme));
    return {
      ...commonTokens,
      "--bg": color(roles.surface),
      "--surface": color(roles.surfaceContainerLow),
      "--surface-low": color(roles.surfaceContainer),
      "--surface-high": color(roles.surfaceContainerHigh),
      "--sidebar": color(roles.surface),
      "--text": color(roles.onSurface),
      "--muted": color(roles.onSurfaceVariant),
      "--border": color(roles.outlineVariant),
      "--accent": color(roles.primary),
      "--on-accent": color(roles.onPrimary),
      "--soft": color(roles.secondaryContainer),
      // Connection success remains green regardless of the chosen hue.
      "--success": dark ? "#7ddba0" : "#24694e",
      "--success-bg": dark ? "#1f4d33" : "#e0f0e6",
      "--danger": color(roles.error),
      "--danger-bg": color(roles.errorContainer),
      "--md-sys-color-primary-container": color(roles.primaryContainer),
      "--md-sys-color-on-primary-container": color(roles.onPrimaryContainer),
      "--md-sys-color-secondary": color(roles.secondary),
      "--md-sys-color-on-secondary": color(roles.onSecondary),
      "--md-sys-color-on-secondary-container": color(roles.onSecondaryContainer),
      "--md-sys-color-tertiary": color(roles.tertiary),
      "--md-sys-color-on-tertiary": color(roles.onTertiary),
      "--md-sys-color-tertiary-container": color(roles.tertiaryContainer),
      "--md-sys-color-on-tertiary-container": color(roles.onTertiaryContainer),
      "--md-sys-color-surface-variant": color(roles.surfaceVariant),
      "--md-sys-color-surface-dim": color(roles.surfaceDim),
      "--md-sys-color-surface-bright": color(roles.surfaceBright),
      "--md-sys-color-surface-container-lowest": color(roles.surfaceContainerLowest),
      "--md-sys-color-surface-container-low": color(roles.surfaceContainerLow),
      "--md-sys-color-surface-container-highest": color(roles.surfaceContainerHighest),
      "--md-sys-color-outline": color(roles.outline),
      "--md-sys-color-inverse-surface": color(roles.inverseSurface),
      "--md-sys-color-inverse-on-surface": color(roles.inverseOnSurface),
      "--md-sys-color-inverse-primary": color(roles.inversePrimary),
      "--md-sys-color-on-error": color(roles.onError),
      "--md-sys-color-on-error-container": color(roles.onErrorContainer),
    };
  }
  return { id: "custom", label: "自定义", light: palette(false), dark: palette(true) } as const;
}
