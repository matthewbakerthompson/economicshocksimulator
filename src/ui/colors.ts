import type { EventType } from "../sim/types";

type Rgb = [number, number, number];

/**
 * Stress ramp for a dark background: lightness rises with stress (dim slate → violet →
 * magenta → coral → amber), so the order reads without relying on hue.
 */
export const STRESS_STOPS: Array<[number, Rgb]> = [
  [0, [27, 34, 51]],
  [0.15, [46, 42, 94]],
  [0.35, [91, 44, 143]],
  [0.55, [163, 53, 143]],
  [0.75, [226, 81, 107]],
  [1, [255, 180, 94]],
];

export const EVENT_COLORS: Record<EventType, string> = {
  unemployment: "#6ea8fe",
  stagflation: "#f5b54a",
  oil_glut: "#4ade9c",
};

/** Edges and receipts that touch the node in focus. */
export const FOCUS_COLOR = "#ff8a7a";
/** Relief: stress taken away. */
export const RELIEF_COLOR = "#7fb2ff";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function hex(rgb: Rgb): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Where a stress level sits on the color ramp. A square root spreads out the low end, so
 * the 0.02–0.1 stress a small shock leaves downstream is visible rather than near-black.
 * The legend uses the same scale.
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
