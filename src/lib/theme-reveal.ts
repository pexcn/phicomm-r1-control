export type ThemeOrigin = { x: number; y: number };

// Match VoHive's circular reveal while keeping the page inside the mask stationary.
export async function revealTheme(origin: ThemeOrigin, apply: () => Promise<void>) {
  const root = document.documentElement;
  const previousName = root.style.getPropertyValue("view-transition-name");
  const previousPriority = root.style.getPropertyPriority("view-transition-name");
  const mask = document.createElement("style");
  mask.dataset.themeReveal = "";
  const running: Animation[] = [];
  let transition: ViewTransition | undefined;

  root.classList.add("theme-transition");
  try {
    transition = document.startViewTransition(async () => {
      root.style.setProperty("view-transition-name", "theme-reveal");
      await apply();
    });
    await transition.ready;

    const capture = getComputedStyle(root, "::view-transition-group(theme-reveal)");
    const viewport = getComputedStyle(root, "::view-transition");
    // Include the captured viewport so mobile browser chrome cannot leave an edge uncovered.
    const width = Math.max(
      innerWidth,
      root.clientWidth,
      parseFloat(capture.width) || 0,
      parseFloat(viewport.width) || 0,
    );
    const height = Math.max(
      innerHeight,
      root.clientHeight,
      parseFloat(capture.height) || 0,
      parseFloat(viewport.height) || 0,
    );
    const x = Math.max(0, Math.min(origin.x, width));
    const y = Math.max(0, Math.min(origin.y, height));
    const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 1;
    mask.textContent = `
      :root.theme-transition::view-transition-group(theme-reveal),
      :root.theme-transition::view-transition-image-pair(theme-reveal) {
        transform-origin: ${x}px ${y}px;
      }
      :root.theme-transition::view-transition-group(theme-reveal) {
        clip-path: circle(${radius}px at ${x}px ${y}px);
      }
    `;
    document.head.append(mask);

    // The inner perspective cancels the expanding mask's scale without resizing its content.
    const endpoints = [0.01, 0.999999];
    const effects: [string, Keyframe[]][] = [
      ["group", endpoints.map((scale) => ({ scale }))],
      [
        "image-pair",
        endpoints.map((scale) => ({
          transform: `perspective(${1 / (1 - scale)}px) translateZ(1px)`,
        })),
      ],
    ];
    for (const [part, frames] of effects) {
      const animation = root.animate(frames, {
        pseudoElement: `::view-transition-${part}(theme-reveal)`,
        duration: 650,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      });
      running.push(animation);
      void animation.finished.catch(() => undefined);
    }
    await Promise.all(running.map((animation) => animation.finished));
  } catch {
    transition?.skipTransition();
    await apply();
  } finally {
    if (transition) await transition.finished.catch(() => undefined);
    running.forEach((animation) => animation.cancel());
    mask.remove();
    if (previousName)
      root.style.setProperty("view-transition-name", previousName, previousPriority);
    else root.style.removeProperty("view-transition-name");
    root.classList.remove("theme-transition");
  }
}
