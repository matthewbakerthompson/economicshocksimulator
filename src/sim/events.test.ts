import { describe, expect, it } from "vitest";
import { buildStepEventEffects, isEventActive } from "./events";
import { NODES } from "./graphSpec";
import type { CausalEvent, NodeId, Scenario } from "./types";

const nodeIds = NODES.map((n) => n.id);

function effectsAt(events: CausalEvent[], t: number) {
  const scenario: Scenario = { events, lagPreset: "medium", bufferPreset: "medium" };
  return buildStepEventEffects({ scenario, t, nodeIds });
}

function amountOn(events: CausalEvent[], t: number, nodeId: NodeId): number {
  return effectsAt(events, t).injectionsByNode[nodeId].reduce((sum, it) => sum + it.amount, 0);
}

const stagflation: CausalEvent = {
  id: "stag",
  type: "stagflation",
  magnitude: 1,
  startStep: 2,
  durationSteps: 6,
};
const oilGlut: CausalEvent = { id: "oil", type: "oil_glut", magnitude: 1, startStep: 4, durationSteps: 6 };

describe("isEventActive", () => {
  it("covers startStep up to, but not including, startStep + durationSteps", () => {
    const ev: CausalEvent = { id: "u", type: "unemployment", magnitude: 1, startStep: 3, durationSteps: 2 };
    expect([2, 3, 4, 5].map((t) => isEventActive(ev, t))).toEqual([false, true, true, false]);
  });
});

describe("buildStepEventEffects", () => {
  it("injects nothing and changes no regime outside an event's window", () => {
    const fx = effectsAt([stagflation], 8);
    expect(nodeIds.every((id) => fx.injectionsByNode[id].length === 0)).toBe(true);
    expect(fx.modifiers).toEqual({ edgeWeightMult: 1, dampMult: 1 });
    expect(fx.narrativeNotes).toEqual([]);
  });

  it("turns unemployment percentage points into stress, capped at 1", () => {
    const at = (magnitude: number) =>
      amountOn(
        [{ id: "u", type: "unemployment", magnitude, startStep: 0, durationSteps: 1 }],
        0,
        "consumers_unemployment"
      );
    expect(at(3)).toBeCloseTo(0.5);
    expect(at(6)).toBeCloseTo(1);
    expect(at(9)).toBeCloseTo(1);
  });

  it("makes stress persist and transmit harder during stagflation", () => {
    const fx = effectsAt([stagflation], 2);
    expect(fx.modifiers.edgeWeightMult).toBeCloseTo(1.08);
    expect(fx.modifiers.dampMult).toBeCloseTo(0.86);
    expect(fx.injectionsByNode.consumers_demand[0].amount).toBeGreaterThan(0);
  });

  it("relieves stress with an oil glut, but less of it during stagflation", () => {
    const alone = amountOn([oilGlut], 4, "credit_borrow_cost");
    const both = amountOn([stagflation, oilGlut], 4, "credit_borrow_cost");
    const stagOnly = amountOn([stagflation], 4, "credit_borrow_cost");

    expect(alone).toBeLessThan(0);
    // Stagflation mutes the oil glut's relief to 55% of its size.
    expect(both - stagOnly).toBeCloseTo(0.55 * alone);
  });

  it("explains the oil glut and stagflation interaction", () => {
    const fx = effectsAt([stagflation, oilGlut], 4);
    const risk = fx.injectionsByNode.markets_risk.find((it) => it.meta?.interactsWith === "stagflation");
    expect(risk?.amount).toBeGreaterThan(0);
    expect(fx.narrativeNotes.some((n) => n.startsWith("Interaction: oil glut relief is muted"))).toBe(true);

    // Before the oil glut starts, there is no interaction to explain.
    const early = effectsAt([stagflation, oilGlut], 3);
    expect(early.injectionsByNode.markets_risk.some((it) => it.meta?.interactsWith)).toBe(false);
    expect(early.narrativeNotes.some((n) => n.startsWith("Interaction:"))).toBe(false);
  });
});
