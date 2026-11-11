export const parkedTonearmAngle = -28.5;

/** Simulate an inward groove, using the original 296px platter and rigid tonearm. */
export function tonearmAngle(position: number, duration: number): number {
  const progress =
    Number.isFinite(position) && Number.isFinite(duration) && duration > 0
      ? Math.max(0, Math.min(1, position / duration))
      : 0;
  // The visible label has radius 92px. Leave clearance for the whole cartridge.
  const radius = 132 - 24 * progress;
  const pivot = { x: 133 + 55 / 3, y: -70 + 42 / 3 };
  const stylus = { x: (255 - 55) / 3, y: (382 - 42) / 3 };
  const center = { x: 148 - pivot.x, y: 148 - pivot.y };
  const pivotDistance = Math.hypot(center.x, center.y);
  const armLength = Math.hypot(stylus.x, stylus.y);
  const cosine =
    (pivotDistance ** 2 + armLength ** 2 - radius ** 2) / (2 * pivotDistance * armLength);
  const grooveAngle = Math.acos(Math.max(-1, Math.min(1, cosine)));
  return (
    ((Math.atan2(center.y, center.x) - grooveAngle - Math.atan2(stylus.y, stylus.x)) * 180) /
    Math.PI
  );
}
