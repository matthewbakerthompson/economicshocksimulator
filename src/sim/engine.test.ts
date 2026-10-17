import { describe, expect, it } from "vitest";
import { simulateScenario } from "./engine";
import { EDGES } from "./graphSpec";
import { defaultScenario } from "./types";
import type { CausalEvent, NodeId, Scenario, SimulationResult } from "./types";

function scenario(events: CausalEvent[], overrides: Partial<Scenario> = {}): Scenario {
  return { lagPreset: "medium", bufferPreset: "medium", events, ...overrides };
}

function unemployment(magnitude: number, startStep: number, durationSteps: number): CausalEvent {
  return { id: "ev_unemployment", type: "unemployment", magnitude, startStep, durationSteps };
}

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

  it("keeps stress within [0, 1 - buffer strength] however hard it is pushed", () => {
    const extreme = scenario(
      [
        unemployment(12, 0, 48),
        { id: "ev_stag", type: "stagflation", magnitude: 1, startStep: 0, durationSteps: 48 },
        { id: "ev_oil", type: "oil_glut", magnitude: 1, startStep: 10, durationSteps: 20 },
      ],
      { bufferPreset: "low", lagPreset: "long" }
    );
    const r = simulateScenario(extreme, 72);
    // Dampening runs after the clamp, so even a saturated node gives back its share.
    // Low buffers decay 3.5% a step; stagflation weakens that by 0.86.
    const ceiling = 1 - 0.035 * 0.86;
    for (const id of r.nodeIds) {
      for (const v of r.seriesByNode[id]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(ceiling + 1e-12);
      }
    }
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

  it("stretches two-month lags to three under the long lag preset", () => {
    const events = [unemployment(1, 1, 1)];
    const long = simulateScenario(scenario(events, { lagPreset: "long" }), 24);

    // One-month lags round back to one month.
    expect(firstEdgeArrival(long, "consumers_unemployment", "consumers_income")).toEqual({ t: 3, lag: 1 });
    expect(firstEdgeArrival(long, "consumers_income", "consumers_savings")).toEqual({ t: 7, lag: 3 });
    expect(firstPositive(long.seriesByNode.consumers_savings)).toBe(8);
  });

  it("accounts for every change in stress with a receipt", () => {
    const r = simulateScenario(defaultScenario(), 36);
    const ceiling = 1 - 0.05;
    let checked = 0;
    for (const id of r.nodeIds) {
      const series = r.seriesByNode[id];
      for (let t = 0; t + 1 < r.steps; t++) {
        // A node at the ceiling was clamped, and the clamp has no receipt.
        if (series[t + 1] >= ceiling - 1e-12) continue;
        const total = r.receiptsByNodeByStep[id][t].items.reduce((sum, it) => sum + it.amount, 0);
        expect(series[t + 1] - series[t]).toBeCloseTo(total, 12);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});
