import { EDGES, NODES } from "./graphSpec";
import type { NodeId, ReceiptItem, Scenario, SimulationResult } from "./types";
import { buildStepEventEffects } from "./events";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * An edge's lag in months under a lag preset. Short and long scale the typical lag and round
 * toward the preset, so neither rounds back to the medium lag: one-month lags become 0 or 2,
 * two-month lags 1 or 3.
 */
export function presetLag(typicalLag: number, preset: Scenario["lagPreset"]): number {
  switch (preset) {
    case "short":
      return Math.max(0, Math.floor(typicalLag * 0.75));
    case "long":
      return Math.ceil(typicalLag * 1.25);
    default:
      return typicalLag;
  }
}

export function dampeningStrength(preset: Scenario["bufferPreset"]): number {
  // Higher buffers = stronger dampening.
  switch (preset) {
    case "low":
      return 0.035;
    case "high":
      return 0.070;
    default:
      return 0.050;
  }
}

/**
 * Each node's stress is a stock. Every month it takes on new stress (its intake) from event
 * shocks and from its incoming edges, and buffers absorb a share of the stress it carries.
 *
 * In month t, an edge with lag L passes on its weight × the intake its source had in month
 * t − L − 1: the new stress that showed up in the source's level at the start of month t − L.
 * Passing on the source's whole level every month instead would compound without limit.
 * While nothing is clamped and buffers hold steady, a node's stress at month t + 1 is its own
 * decayed shocks plus, for each incoming edge, weight × the source's stress at month t − L, so
 * the weight is the edge's pass-through. Every loop in the graph has a gain below 1, so intake
 * dies out after the events end and buffers bring every node back toward zero.
 */
export function simulateScenario(scenario: Scenario, steps: number): SimulationResult {
  const nodeIds = NODES.map((n) => n.id);

  // State history: S[id][t] is a node's stress at the start of month t.
  const S = {} as Record<NodeId, number[]>;
  // Intake history: the stress a node took on during month t, after any clamp and before buffers.
  const intake = {} as Record<NodeId, number[]>;

  // Receipts: for each node, list of receipts per step.
  const receiptsByNodeByStep = {} as SimulationResult["receiptsByNodeByStep"];
  for (const id of nodeIds) {
    S[id] = [0]; // Initialize at zero stress.
    intake[id] = [];
    receiptsByNodeByStep[id] = [];
  }

  const dampBase = dampeningStrength(scenario.bufferPreset);

  for (let t = 0; t < steps; t++) {
    const inflow = {} as Record<NodeId, number>;
    for (const id of nodeIds) inflow[id] = 0;

    // Base receipts per node at this step.
    const stepReceipts = {} as Record<NodeId, ReceiptItem[]>;
    for (const id of nodeIds) stepReceipts[id] = [];

    // External causal events (can be positive or negative stress adjustments).
    const stepEvents = buildStepEventEffects({ scenario, t, nodeIds });
    for (const id of nodeIds) {
      for (const it of stepEvents.injectionsByNode[id]) {
        inflow[id] += it.amount;
        stepReceipts[id].push(it);
      }
    }
    // Put step-level notes on a single “anchor” node so receipts aren’t spammed.
    for (const note of stepEvents.narrativeNotes) {
      const anchor: NodeId = "consumers_unemployment";
      stepReceipts[anchor].push({
        kind: "shock",
        label: note,
        amount: 0,
        meta: { t, kind: "note" },
      });
    }

    // Transmission along edges: a share of the source's lagged intake (relief passes on too).
    const edgeWeightMult = stepEvents.modifiers.edgeWeightMult;
    for (const e of EDGES) {
      const lag = presetLag(e.typicalLag, scenario.lagPreset);
      const srcT = t - lag - 1;
      if (srcT < 0) continue;
      const flow = intake[e.from][srcT] * e.weight * edgeWeightMult;
      if (flow === 0) continue;
      inflow[e.to] += flow;
      stepReceipts[e.to].push({
        kind: "edge",
        label: `${e.label} from ${e.from}`,
        amount: flow,
        meta: { from: e.from, lag, weight: e.weight, edgeWeightMult },
      });
    }

    const damp = dampBase * stepEvents.modifiers.dampMult;
    for (const id of nodeIds) {
      // Dampening/decay of the stress carried into the month (keeps the system stable + interpretable).
      const before = S[id][t];
      const decay = before * damp;
      if (decay > 0) {
        stepReceipts[id].push({
          kind: "dampener",
          label: "Buffers / decay",
          amount: -decay,
          meta: { strength: damp, base: dampBase, mult: stepEvents.modifiers.dampMult },
        });
      }

      // Stress stays within [0, 1]; whatever the bound cuts off gets its own receipt.
      const raw = before - decay + inflow[id];
      const next = clamp01(raw);
      const clamp = next - raw;
      if (clamp !== 0) {
        stepReceipts[id].push({
          kind: "clamp",
          label: clamp < 0 ? "Clamp: stress capped at 1" : "Clamp: relief floored at 0",
          amount: clamp,
          meta: { unclamped: raw },
        });
      }

      intake[id][t] = inflow[id] + clamp;
      if (t + 1 < steps) S[id][t + 1] = next;

      // Save step receipts (top contributions remain visible; UI can sort).
      receiptsByNodeByStep[id].push({ nodeId: id, items: stepReceipts[id] });
    }
  }

  return {
    steps,
    nodeIds,
    seriesByNode: S,
    receiptsByNodeByStep,
  };
}
