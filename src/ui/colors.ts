export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function hex(n: number): string {
  const s = Math.round(n).toString(16).padStart(2, "0");
  return s;
}

export function mixRGB(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const tt = clamp01(t);
  return [lerp(a[0], b[0], tt), lerp(a[1], b[1], tt), lerp(a[2], b[2], tt)];
}

export function rgbToHex(rgb: [number, number, number]): string {
  return `#${hex(rgb[0])}${hex(rgb[1])}${hex(rgb[2])}`;
}

// Neon-cosmos ramp: icy cyan -> electric violet -> hot pink.
const C0: [number, number, number] = [80, 230, 255];
const C1: [number, number, number] = [140, 120, 255];
const C2: [number, number, number] = [255, 80, 160];

export function stressToColor(stress01: number): string {
  const s = clamp01(stress01);
  if (s < 0.55) {
    return rgbToHex(mixRGB(C0, C1, s / 0.55));
  }
  return rgbToHex(mixRGB(C1, C2, (s - 0.55) / 0.45));
}

export function stressToHalo(stress01: number): string {
  const s = clamp01(stress01);
  // Slightly brighter than core.
  const base = s < 0.55 ? mixRGB(C0, C1, s / 0.55) : mixRGB(C1, C2, (s - 0.55) / 0.45);
  const boosted = mixRGB(base, [255, 255, 255], 0.15);
  return rgbToHex(boosted);
}



