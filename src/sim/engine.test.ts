import { describe, expect, it } from "vitest";
import { simulateScenario } from "./engine";
import { buildStepEventEffects } from "./events";
import { EDGES, NODES } from "./graphSpec";
import { defaultScenario } from "./types";
import type { CausalEvent, NodeId, Scenario, SimulationResult } from "./types";

function scenario(events: CausalEvent[], overrides: Partial<Scenario> = {}): Scenario {
  return { lagPreset: "medium", bufferPreset: "medium", events, ...overrides };
}

function unemployment(magnitude: number, startStep: number, durationSteps: number): CausalEvent {
  return { id: "ev_unemployment", type: "unemployment", magnitude, startStep, durationSteps };
}

// Every event at full strength for most of the run, with the weakest buffers.
const extreme = scenario(
  [
    unemployment(12, 0, 48),
    { id: "ev_stag", type: "stagflation", magnitude: 1, startStep: 0, durationSteps: 48 },
    { id: "ev_oil", type: "oil_glut", magnitude: 1, startStep: 10, durationSteps: 20 },
  ],
  { bufferPreset: "low", lagPreset: "long" }
);

function firstPositive(series: number[]): number {
  return series.findIndex((v) => v > 0);
}

/** The first step at which `to` receives stress along the edge from `from`. */
function firstEdgeArrival(r: SimulationResult, from: NodeId, to: NodeId): { t: number; lag: number } | null {
  const steps = r.receiptsByNodeByStep[to];
  for (let t = 0; t < steps.length; t++) {
    const item = steps[t].items.find((it) => it.kind === "edge" && it.meta?.from === from);
    if (item) return { t, lag: Number(item.meta?.lag) };
  }
  return null;
}

describe("simulateScenario", () => {
  it("is deterministic and leaves the scenario untouched", () => {
    const s = scenario([
      unemployment(2.5, 1, 6),
      { id: "ev_stag", type: "stagflation", magnitude: 0.7, startStep: 3, durationSteps: 8 },
      { id: "ev_oil", type: "oil_glut", magnitude: 0.5, startStep: 5, durationSteps: 4 },
    ]);
    const before = structuredClone(s);

    const a = simulateScenario(s, 36);
    const b = simulateScenario(s, 36);

    expect(a).toEqual(b);
    expect(s).toEqual(before);
  });

  it("starts every node at zero stress and does nothing without events", () => {
    const r = simulateScenario(scenario([]), 24);
    for (const id of r.nodeIds) {
      expect(r.seriesByNode[id]).toHaveLength(24);
      expect(r.seriesByNode[id].every((v) => v === 0)).toBe(true);
    }
  });

  it("keeps stress within [0, 1] however hard it is pushed", () => {
    const r = simulateScenario(extreme, 72);
    for (const id of r.nodeIds) {
      for (const v of r.seriesByNode[id]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    // Stacked shocks can still push a node all the way to the cap.
    expect(Math.max(...r.nodeIds.flatMap((id) => r.seriesByNode[id]))).toBe(1);
  });

  it("lets a small shock rise and then fade back toward zero after its window", () => {
    // Half a point of unemployment for one month.
    const r = simulateScenario(scenario([unemployment(0.5, 1, 1)]), 72);
    for (const id of r.nodeIds) {
      const series = r.seriesByNode[id];
      const peak = Math.max(...series);
      // The shock reaches every node, but nowhere near saturation.
      expect(peak).toBeGreaterThan(0);
      expect(peak).toBeLessThan(0.1);
      // Once the cascade and its echo round the loops have passed, stress only falls, and it is
      // well on its way back to zero.
      for (let t = 36; t < r.steps; t++) expect(series[t]).toBeLessThanOrEqual(series[t - 1]);
      expect(series[r.steps - 1]).toBeLessThan(peak / 4);
    }
  });

  it("keeps every feedback loop's gain below 1, even with every event active", () => {
    // Lag-collapsed transmission matrix: W[to][from] = weight × the regime's edge multiplier.
    const types = ["unemployment", "stagflation", "oil_glut"] as const;
    const all = types.map(
      (type): CausalEvent => ({ id: type, type, magnitude: 1, startStep: 0, durationSteps: 1 })
    );
    const nodeIds = NODES.map((n) => n.id);
    const { edgeWeightMult } = buildStepEventEffects({ scenario: scenario(all), t: 0, nodeIds }).modifiers;
    let W = nodeIds.map(() => nodeIds.map(() => 0));
    for (const e of EDGES) W[nodeIds.indexOf(e.to)][nodeIds.indexOf(e.from)] += e.weight * edgeWeightMult;

    // Spectral radius ρ(W) ≤ ‖W^64‖^(1/64). Below 1, the stress a shock sends round the
    // loops shrinks every lap, so intake dies out and buffers bring every node back down.
    const square = (A: number[][]) =>
      A.map((row) => A[0].map((_, j) => row.reduce((s, a, k) => s + a * A[k][j], 0)));
    for (let i = 0; i < 6; i++) W = square(W);
    const norm = Math.max(...W.map((row) => row.reduce((s, a) => s + Math.abs(a), 0)));
    expect(Math.pow(norm, 1 / 64)).toBeLessThan(1);
  });

  it("never leaves more stress with stronger buffers", () => {
    const events = [unemployment(1.5, 1, 4)];
    const low = simulateScenario(scenario(events, { bufferPreset: "low" }), 36);
    const medium = simulateScenario(scenario(events, { bufferPreset: "medium" }), 36);
    const high = simulateScenario(scenario(events, { bufferPreset: "high" }), 36);
    for (const id of low.nodeIds) {
      for (let t = 0; t < 36; t++) {
        expect(medium.seriesByNode[id][t]).toBeLessThanOrEqual(low.seriesByNode[id][t]);
        expect(high.seriesByNode[id][t]).toBeLessThanOrEqual(medium.seriesByNode[id][t]);
      }
    }
  });

  it("sends an injection along each edge only after that edge's lag", () => {
    // A one-month unemployment shock at month 1 shows up in month 2's state.
    const r = simulateScenario(scenario([unemployment(1, 1, 1)]), 24);
    const S = r.seriesByNode;

    expect(firstPositive(S.consumers_unemployment)).toBe(2);
    // unemployment -> income has a one-month lag: income first moves at month 3,
    // which is month 4's state.
    expect(firstEdgeArrival(r, "consumers_unemployment", "consumers_income")).toEqual({ t: 3, lag: 1 });
    expect(firstPositive(S.consumers_income)).toBe(4);
    // income -> savings has a two-month lag.
    expect(firstEdgeArrival(r, "consumers_income", "consumers_savings")).toEqual({ t: 6, lag: 2 });
    expect(firstPositive(S.consumers_savings)).toBe(7);

    // The same holds for every edge the shock reaches.
    for (const e of EDGES) {
      const srcFirst = firstPositive(S[e.from]);
      const arrival = firstEdgeArrival(r, e.from, e.to);
      if (srcFirst < 0 || srcFirst + e.typicalLag >= r.steps) {
        expect(arrival).toBeNull();
        continue;
      }
      expect(arrival).toEqual({ t: srcFirst + e.typicalLag, lag: e.typicalLag });
    }
  });

  it("makes each edge's weight its pass-through, with no compounding along the way", () => {
    // With no clamps or regime changes, a node the events don't hit directly carries exactly
    // weight × lagged stress from each of its sources.
    const r = simulateScenario(defaultScenario(), 36);
    const S = r.seriesByNode;
    for (const id of r.nodeIds) {
      if (id === "consumers_unemployment") continue;
      const incoming = EDGES.filter((e) => e.to === id);
      for (let t = 0; t + 1 < r.steps; t++) {
        const expected = incoming.reduce((sum, e) => sum + e.weight * (S[e.from][t - e.typicalLag] ?? 0), 0);
        expect(S[id][t + 1]).toBeCloseTo(expected, 12);
      }
    }
  });

  it("shortens lags under the short preset and stretches them under the long one", () => {
    const events = [unemployment(1, 1, 1)];
    const run = (lagPreset: Scenario["lagPreset"]) => simulateScenario(scenario(events, { lagPreset }), 48);
    const short = run("short");
    const medium = run("medium");
    const long = run("long");

    // One-month lags become zero or two months; two-month lags one or three.
    expect(firstEdgeArrival(short, "consumers_unemployment", "consumers_income")).toEqual({ t: 2, lag: 0 });
    expect(firstEdgeArrival(long, "consumers_unemployment", "consumers_income")).toEqual({ t: 4, lag: 2 });
    expect(firstEdgeArrival(short, "consumers_income", "consumers_savings")).toEqual({ t: 4, lag: 1 });
    expect(firstEdgeArrival(long, "consumers_income", "consumers_savings")).toEqual({ t: 8, lag: 3 });

    // Every node downstream of the shock feels it sooner under short lags and later under long ones.
    for (const id of medium.nodeIds) {
      if (id === "consumers_unemployment") continue;
      const m = firstPositive(medium.seriesByNode[id]);
      expect(firstPositive(short.seriesByNode[id])).toBeLessThan(m);
      expect(firstPositive(long.seriesByNode[id])).toBeGreaterThan(m);
    }
  });

  it("accounts for every change in stress with a receipt, clamps included", () => {
    let clamps = 0;
    for (const s of [defaultScenario(), extreme]) {
      const r = simulateScenario(s, 36);
      for (const id of r.nodeIds) {
        const series = r.seriesByNode[id];
        for (let t = 0; t + 1 < r.steps; t++) {
          const items = r.receiptsByNodeByStep[id][t].items;
          const total = items.reduce((sum, it) => sum + it.amount, 0);
          expect(series[t + 1] - series[t]).toBeCloseTo(total, 12);
          clamps += items.filter((it) => it.kind === "clamp").length;
        }
      }
    }
    // The extreme scenario hits the bounds, so the clamp receipts are exercised.
    expect(clamps).toBeGreaterThan(0);
  });
});
