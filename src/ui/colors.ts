type Rgb = [number, number, number];

/**
 * Stress ramp for a white page: one vermilion ink that darkens as stress rises, starting
 * from a warm grey that still reads as "calm, but present". Lightness falls steadily, so
 * the order reads without relying on hue.
 */
export const STRESS_STOPS: Array<[number, Rgb]> = [
  [0, [236, 235, 232]],
  [0.3, [236, 183, 167]],
  [0.6, [214, 104, 80]],
  [0.82, [184, 52, 30]],
  [1, [110, 27, 15]],
];

/** The one signal ink: stress, the story's focus, and the selected node. */
export const SIGNAL = "#c23b22";
/** Relief: stress taken away. The only other hue on the page. */
export const RELIEF = "#3d6e9e";
/** Context: everything that isn't the focus. Events are named, not colored, so they use it too. */
export const CONTEXT = "#b9b9b4";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function hex(rgb: Rgb): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Where a stress level sits on the color ramp. A square root spreads out the low end, so
 * the 0.02–0.1 stress a small shock leaves downstream is visible rather than blank.
 */
export function stressPosition(stress01: number): number {
  return Math.sqrt(clamp01(stress01));
}

/** Stress levels the legend labels, at their positions on the square-root scale. */
export const LEGEND_TICKS = [0, 0.05, 0.25, 0.5, 1];

export function stressColor(stress01: number): string {
  return rampColor(stressPosition(stress01));
}

/** The ramp itself, from 0 (calm) to 1 (severe), before the square root is applied. */
export function rampColor(position01: number): string {
  const s = clamp01(position01);
  for (let i = 1; i < STRESS_STOPS.length; i++) {
    const [b, cb] = STRESS_STOPS[i];
    if (s <= b) {
      const [a, ca] = STRESS_STOPS[i - 1];
      const f = (s - a) / (b - a);
      return hex(ca.map((x, k) => x + (cb[k] - x) * f) as Rgb);
    }
  }
  return hex(STRESS_STOPS[STRESS_STOPS.length - 1][1]);
}

/** CSS gradient for legends, left to right along the ramp (place labels with stressPosition). */
export function stressGradientCss(): string {
  return `linear-gradient(90deg, ${STRESS_STOPS.map(([p, c]) => `${hex(c)} ${p * 100}%`).join(", ")})`;
}
