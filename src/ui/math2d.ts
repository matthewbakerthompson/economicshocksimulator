export type Vec2 = { x: number; y: number };

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function mul(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function norm(v: Vec2): Vec2 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function perp(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}



