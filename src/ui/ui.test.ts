import { describe, expect, it } from "vitest";
import { simulateScenario } from "../sim/engine";
import { EDGES, NODES } from "../sim/graphSpec";
import { presetById } from "../sim/presets";
import type { Scenario } from "../sim/types";
import { stressColor } from "./colors";
import { NODE_POSITIONS, VIEW, edgeGeometry, labelLines } from "./networkLayout";
import { receiptRows } from "./receipts";

describe("receiptRows", () => {
  const s: Scenario = { events: presetById("stagflation_oil")!.events, lagPreset: "medium", bufferPreset: "medium" };
  const r = simulateScenario(s, 24);

  it("explains every move into a month, and sums to it", () => {
    for (const id of r.nodeIds) {
      expect(receiptRows(r, id, 0)).toEqual([]);
      for (let t = 1; t < r.steps; t++) {
        const total = receiptRows(r, id, t).reduce((sum, row) => sum + row.amount, 0);
        expect(r.seriesByNode[id][t] - r.seriesByNode[id][t - 1]).toBeCloseTo(total, 12);
      }
    }
  });

  it("names the channels and puts buffers after the drivers", () => {
    const rows = receiptRows(r, "consumers_delinquency", 12);
    expect(rows.map((row) => row.title)).toEqual(["Income Stress", "Borrow Costs", "Credit Access", "Buffers"]);
    expect(rows[0]).toMatchObject({ from: "consumers_income", detail: "Income → delinquencies · lag 2 · w 0.52" });
    expect(rows[3].detail).toBe("absorb 5% of the stress carried in");
  });
});

describe("network layout", () => {
  it("places every node inside the view, well apart from the others", () => {
    for (const n of NODES) {
      const [x, y] = NODE_POSITIONS[n.id];
      expect(x).toBeGreaterThan(40);
      expect(x).toBeLessThan(VIEW.width - 30);
      expect(y).toBeGreaterThan(40);
      // Room for the label and its value below the node (their baselines sit 27 and 13 units apart).
      expect(y + 27 + 13 * labelLines(n.label).length + 4).toBeLessThan(VIEW.height);
      for (const m of NODES) {
        if (m.id === n.id) continue;
        const [x2, y2] = NODE_POSITIONS[m.id];
        expect(Math.hypot(x - x2, y - y2)).toBeGreaterThan(70);
      }
    }
  });

  it("draws every edge", () => {
    for (const e of EDGES) {
      const g = edgeGeometry(e);
      expect(g.path).toMatch(/^M[\d.]+ [\d.]+ C/);
      expect(g.path + g.arrow).not.toContain("NaN");
    }
  });

  it("wraps only long labels", () => {
    expect(labelLines("Unemployment")).toEqual(["Unemployment"]);
    expect(labelLines("Credit Standards")).toEqual(["Credit", "Standards"]);
  });
});

describe("stressColor", () => {
  it("runs from the calm slate to the severe amber, clamping outside 0–1", () => {
    expect(stressColor(-1)).toBe(stressColor(0));
    expect(stressColor(0)).toBe("#1b2233");
    expect(stressColor(2)).toBe("#ffb45e");
  });
});
