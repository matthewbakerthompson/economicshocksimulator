import { describe, expect, it } from "vitest";
import { simulateScenario } from "../sim/engine";
import { EDGES, NODES } from "../sim/graphSpec";
import { presetById } from "../sim/presets";
import type { Scenario } from "../sim/types";
import { LEGEND_TICKS, rampColor, stressColor, stressPosition } from "./colors";
import { NODE_POSITIONS, VIEW, edgeGeometry, labelLines } from "./networkLayout";
import { VISIBLE, namedDrivers, receiptRows } from "./receipts";

describe("receiptRows", () => {
  const s: Scenario = {
    events: presetById("stagflation_oil")!.events,
    lagPreset: "medium",
    bufferPreset: "medium",
  };
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
    expect(rows.map((row) => row.title)).toEqual([
      "Borrowing costs",
      "Income squeeze",
      "Credit squeeze",
      "Buffers",
    ]);
    expect(rows[1]).toMatchObject({
      from: "consumers_income",
      detail: "Lower incomes cause missed payments. 2-month lag, weight 0.52.",
    });
    expect(rows[3].detail).toBe("Absorb 5% of the stress carried into the month.");
  });

  it("folds channels too small to print into one row", () => {
    const edge = (from: string, amount: number) => ({
      kind: "edge" as const,
      label: "x",
      amount,
      meta: { from, lag: 1, weight: 0.2, edgeWeightMult: 1 },
    });
    const items = [
      edge("consumers_income", 0.03),
      edge("credit_access", 0.0002),
      edge("credit_borrow_cost", -0.0001),
      { kind: "dampener" as const, label: "Buffers / decay", amount: -0.01, meta: { strength: 0.05 } },
    ];
    const fake = {
      ...r,
      receiptsByNodeByStep: {
        ...r.receiptsByNodeByStep,
        consumers_delinquency: [{ nodeId: "consumers_delinquency" as const, items }],
      },
    };
    const rows = receiptRows(fake, "consumers_delinquency", 1);
    expect(rows.map((row) => row.title)).toEqual(["Income squeeze", "2 smaller channels", "Buffers"]);
    expect(rows[1].amount).toBeCloseTo(0.0001, 12);
    expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBeCloseTo(0.0201, 12);
    expect(namedDrivers(rows).map((row) => row.title)).toEqual(["Income squeeze"]);
    expect(Math.abs(namedDrivers(rows)[0].amount)).toBeGreaterThanOrEqual(VISIBLE);
  });

  it("labels every receipt with names, never node ids", () => {
    for (const id of r.nodeIds) {
      for (const step of r.receiptsByNodeByStep[id]) {
        for (const it of step.items) expect(it.label).not.toMatch(/(consumers|credit|markets)_/);
      }
    }
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
    expect(labelLines("Savings drawdown")).toEqual(["Savings drawdown"]);
    expect(labelLines("A rather longer label")).toEqual(["A", "rather longer label"]);
  });
});

describe("stressColor", () => {
  it("runs from a calm grey to a deep vermilion, clamping outside 0–1", () => {
    expect(stressColor(-1)).toBe(stressColor(0));
    expect(stressColor(0)).toBe("#ecebe8");
    expect(stressColor(2)).toBe("#6e1b0f");
  });

  it("uses a square-root scale, so small stress is visible", () => {
    // A 0.04 stress sits a fifth of the way along the ramp, not a twenty-fifth.
    expect(stressPosition(0.04)).toBeCloseTo(0.2);
    expect(stressColor(0.04)).toBe(rampColor(0.2));
    expect(stressColor(0.04)).not.toBe(stressColor(0));
    expect(LEGEND_TICKS.map(stressPosition)).toEqual([0, Math.sqrt(0.05), 0.5, Math.sqrt(0.5), 1]);
  });
});
