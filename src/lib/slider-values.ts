export function sliderPercent(value: number, maximum = 100): string {
  return Number.isFinite(value) && maximum > 0 ? `${Math.round((value / maximum) * 100)}%` : "—";
}

export function sliderDecibels(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${(Object.is(rounded, -0) ? 0 : rounded).toFixed(1)} dB`;
}

// Include clipping scroll containers across Material's slotted shadow DOM.
export function sliderBounds(element: HTMLElement) {
  const own = element.getBoundingClientRect();
  const bounds = {
    left: Math.max(8, own.left),
    right: Math.min(window.innerWidth - 8, own.right),
    top: 8,
    bottom: window.innerHeight - 8,
  };
  let inDialog = false;
  let current: Element | null = element;
  while (current) {
    const root = current.getRootNode();
    current =
      current.assignedSlot ||
      current.parentElement ||
      (root instanceof ShadowRoot ? root.host : null);
    if (!current || current === document.documentElement) break;
    if (current.tagName === "MD-DIALOG") inDialog = true;
    const style = getComputedStyle(current);
    const rect = current.getBoundingClientRect();
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
      bounds.left = Math.max(bounds.left, rect.left);
      bounds.right = Math.min(bounds.right, rect.right);
    }
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
      bounds.top = Math.max(bounds.top, rect.top);
      bounds.bottom = Math.min(bounds.bottom, rect.bottom);
    }
  }
  // Fixed navigation must not cover a page slider's value indicator.
  // Native dialogs are in the top layer and do not need these exclusions.
  if (!inDialog) {
    for (const navigation of document.querySelectorAll(".topbar, .bottom-nav")) {
      const style = getComputedStyle(navigation);
      if (style.display === "none" || !/^(sticky|fixed)$/.test(style.position)) continue;
      const rect = navigation.getBoundingClientRect();
      if (rect.top <= 8 && rect.bottom > 8) bounds.top = Math.max(bounds.top, rect.bottom + 8);
      if (rect.bottom >= window.innerHeight - 8 && rect.top < window.innerHeight - 8)
        bounds.bottom = Math.min(bounds.bottom, rect.top - 8);
    }
  }
  return bounds;
}
