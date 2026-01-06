import type Sigma from "sigma";
import type Graph from "graphology";
import type { NodeId } from "../sim/types";
import { clamp01, lerp, add, mul, norm, perp, sub, type Vec2 } from "./math2d";
import { stressToColor } from "./colors";

type EdgeLike = { from: NodeId; to: NodeId; weight: number; lag: number };

export type WaveOverlayState = {
  tFloat: number;
  seriesByNode: Record<NodeId, number[]>;
  // A continuous phase for smooth motion independent of discrete timeline.
  phase: number;
  unemploymentWindows: Array<{ startStep: number; durationSteps: number; magnitude: number }>;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function radialGlow(ctx: CanvasRenderingContext2D, p: Vec2, r: number, colorHex: string, alpha: number) {
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  g.addColorStop(0, rgba(colorHex, alpha));
  g.addColorStop(0.35, rgba(colorHex, alpha * 0.45));
  g.addColorStop(1, rgba(colorHex, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

type Star = { x: number; y: number; r: number; tw: number; ph: number; a: number };
const STARS: Star[] = Array.from({ length: 260 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: lerp(0.4, 1.8, Math.random()),
  tw: lerp(0.6, 1.6, Math.random()),
  ph: Math.random() * Math.PI * 2,
  a: lerp(0.04, 0.16, Math.random()),
}));

function drawStarfield(ctx: CanvasRenderingContext2D, w: number, h: number, phase: number) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  for (const s of STARS) {
    const tw = 0.5 + 0.5 * Math.sin(phase * s.tw + s.ph);
    const a = s.a * (0.4 + 0.6 * tw);
    ctx.fillStyle = `rgba(235, 245, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawFlowParticles(ctx: CanvasRenderingContext2D, a: Vec2, b: Vec2, intensity: number, phase: number, colorHex: string) {
  const d = sub(b, a);
  const len = Math.max(1, Math.hypot(d.x, d.y));
  const dir = norm(d);
  const n = perp(dir);

  const count = Math.round(lerp(1, 10, intensity));
  const speed = lerp(0.25, 1.2, intensity);
  const amp = lerp(0.6, 4.5, intensity);

  for (let i = 0; i < count; i++) {
    const tt = (phase * speed + i / count) % 1;
    const along = tt * len;
    const wiggle = Math.sin(phase * 6 + i * 1.7) * amp;
    const p = add(add(a, mul(dir, along)), mul(n, wiggle));

    const r = lerp(0.8, 2.4, intensity);
    const a0 = lerp(0.08, 0.40, intensity) * (0.45 + 0.55 * Math.sin(phase * 3 + i));
    radialGlow(ctx, p, r * 10, colorHex, a0 * 0.32);

    ctx.fillStyle = rgba(colorHex, a0);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWavyBeam(ctx: CanvasRenderingContext2D, a: Vec2, b: Vec2, intensity: number, phase: number, colorHex: string) {
  const d = sub(b, a);
  const len = Math.max(1, Math.hypot(d.x, d.y));
  const dir = norm(d);
  const n = perp(dir);

  // Segment count scales with length; keeps waves smooth.
  const segs = Math.min(80, Math.max(10, Math.round(len / 18)));
  const amp = lerp(1.6, 16, intensity); // px
  const freq = lerp(2.4, 7.4, intensity); // waves along edge

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Two-pass beam for glow: fat faint + thin hot core.
  const outerW = lerp(1.8, 9.5, intensity);
  const innerW = lerp(1.1, 3.6, intensity);

  // Outer glow
  ctx.strokeStyle = rgba(colorHex, lerp(0.10, 0.40, intensity));
  ctx.lineWidth = outerW;
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const tt = i / segs;
    const along = tt * len;
    const wiggle = Math.sin(tt * Math.PI * 2 * freq + phase * 2.2) * amp;
    const p = add(add(a, mul(dir, along)), mul(n, wiggle));
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  // Inner hot core (slightly phase-shifted)
  ctx.strokeStyle = rgba(colorHex, lerp(0.18, 0.78, intensity));
  ctx.lineWidth = innerW;
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const tt = i / segs;
    const along = tt * len;
    const wiggle = Math.sin(tt * Math.PI * 2 * (freq + 0.4) + phase * 3.1 + 1.2) * (amp * 0.55);
    const p = add(add(a, mul(dir, along)), mul(n, wiggle));
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}

function drawShockRings(
  ctx: CanvasRenderingContext2D,
  center: Vec2,
  isActive: boolean,
  intensity: number,
  phase: number,
  colorHex: string
) {
  if (!isActive) return;
  const rings = 5;
  for (let i = 0; i < rings; i++) {
    const local = (phase * 0.72 + i / rings) % 1;
    const r = lerp(18, 320, local);
    const a = (1 - local) * lerp(0.12, 0.42, intensity);
    ctx.strokeStyle = rgba(colorHex, a);
    ctx.lineWidth = lerp(1.2, 5.0, intensity) * (1 - local);
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawWaveOverlay(args: {
  ctx: CanvasRenderingContext2D;
  sigma: Sigma;
  graph: Graph;
  edges: EdgeLike[];
  state: WaveOverlayState;
}) {
  const { ctx, sigma, graph, edges, state } = args;

  // With DPR transforms, use the *CSS pixel* size for drawing.
  const w = ctx.canvas.clientWidth || ctx.canvas.width;
  const h = ctx.canvas.clientHeight || ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);

  drawStarfield(ctx, w, h, state.phase);
  drawVignette(ctx, w, h);

  // Additive / screen-like blending for neon intensity.
  ctx.globalCompositeOperation = "lighter";

  // Gather node screen positions.
  const nodePos = new Map<NodeId, Vec2>();
  for (const node of graph.nodes()) {
    const dd = sigma.getNodeDisplayData(node);
    if (!dd) continue;
    nodePos.set(node as NodeId, { x: dd.x, y: dd.y });
  }

  const seriesAt = (id: NodeId, at: number): number => {
    const series = state.seriesByNode[id];
    const maxIdx = Math.max(0, series.length - 1);
    const clamped = Math.max(0, Math.min(maxIdx, at));
    const i0 = Math.floor(clamped);
    const i1 = Math.min(maxIdx, i0 + 1);
    const f = clamped - i0;
    return series[i0] * (1 - f) + series[i1] * f;
  };

  // Draw node halos (ambient field).
  for (const [id, p] of nodePos) {
    const s = seriesAt(id, state.tFloat);
    const color = stressToColor(s);
    radialGlow(ctx, p, lerp(30, 120, s), color, lerp(0.10, 0.38, s));
  }

  // Shock rings from unemployment node while shock is active in timeline.
  const uPos = nodePos.get("consumers_unemployment");
  if (uPos) {
    const u = seriesAt("consumers_unemployment", state.tFloat);
    const anyActive = state.unemploymentWindows.some(
      (w) =>
        state.tFloat >= w.startStep &&
        state.tFloat < w.startStep + w.durationSteps &&
        w.durationSteps > 0
    );
    drawShockRings(ctx, uPos, anyActive, Math.max(0.15, u), state.phase, "#ff50a0");
  }

  // Draw wave-beams on edges (intensity driven by lagged source activation).
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const a = nodePos.get(e.from);
    const b = nodePos.get(e.to);
    if (!a || !b) continue;

    const srcT = Math.max(0, state.tFloat - e.lag);
    const src = seriesAt(e.from, srcT);
    const intensity = clamp01(src * e.weight * 3.6);
    if (intensity < 0.01) continue;

    const color = stressToColor(clamp01(src));
    // Per-edge phase offset breaks uniformity.
    const p = state.phase + i * 0.07;
    drawWavyBeam(ctx, a, b, intensity, p, color);
    drawFlowParticles(ctx, a, b, intensity, p, color);
  }

  // Restore default blending.
  ctx.globalCompositeOperation = "source-over";
}


