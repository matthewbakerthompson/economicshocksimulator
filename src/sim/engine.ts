import { EDGES, NODES } from "./graphSpec";
import type { NodeId, ReceiptItem, Scenario, SimulationResult } from "./types";
import { buildStepEventEffects } from "./events";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function lagMultiplier(preset: Scenario["lagPreset"]): number {
  switch (preset) {
    case "short":
      return 0.75;
    case "long":
      return 1.25;
    default:
      return 1.0;
  }
}

function dampeningStrength(preset: Scenario["bufferPreset"]): number {
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

export function simulateScenario(scenario: Scenario, steps: number): SimulationResult {
  const nodeIds = NODES.map((n) => n.id);

  // State history (for lagged access).
  const S = {} as Record<NodeId, number[]>;
  for (const id of nodeIds) S[id] = [];

  // Receipts: for each node, list of receipts per step.
  const receiptsByNodeByStep = {} as SimulationResult["receiptsByNodeByStep"];
  for (const id of nodeIds) receiptsByNodeByStep[id] = [];

  // Initialize at zero stress.
  for (const id of nodeIds) S[id][0] = 0;

  const lagMult = lagMultiplier(scenario.lagPreset);
  const dampBase = dampeningStrength(scenario.bufferPreset);

  for (let t = 0; t < steps; t++) {
    // Ensure we have a current state value for all nodes at step t.
    if (t > 0) {
      for (const id of nodeIds) {
        if (typeof S[id][t] !== "number") S[id][t] = S[id][t - 1] ?? 0;
      }
    }

    const next = {} as Record<NodeId, number>;
    for (const id of nodeIds) next[id] = S[id][t] ?? 0;

    // Base receipts per node at this step.
    const stepReceipts = {} as Record<NodeId, ReceiptItem[]>;
    for (const id of nodeIds) stepReceipts[id] = [];

    // External causal events (can be positive or negative stress adjustments).
    const stepEvents = buildStepEventEffects({ scenario, t, nodeIds });
    for (const id of nodeIds) {
      for (const it of stepEvents.injectionsByNode[id]) {
        next[id] = clamp01(next[id] + it.amount);
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

    // Transmission along edges using lagged source.
    for (const e of EDGES) {
      const lag = Math.max(0, Math.round(e.typicalLag * lagMult));
      const srcT = Math.max(0, t - lag);
      const src = S[e.from][srcT] ?? 0;
      const flow = src * e.weight * stepEvents.modifiers.edgeWeightMult;
      if (flow <= 0) continue;
      next[e.to] = clamp01(next[e.to] + flow);
      stepReceipts[e.to].push({
        kind: "edge",
        label: `${e.label} from ${e.from}`,
        amount: flow,
        meta: { from: e.from, lag, weight: e.weight, edgeWeightMult: stepEvents.modifiers.edgeWeightMult },
      });
    }

    // Dampening/decay everywhere (keeps the system stable + interpretable).
    const damp = dampBase * stepEvents.modifiers.dampMult;
    for (const id of nodeIds) {
      const before = next[id];
      const decay = before * damp;
      if (decay > 0) {
        next[id] = clamp01(before - decay);
        stepReceipts[id].push({
          kind: "dampener",
          label: "Buffers / decay",
          amount: -decay,
          meta: { strength: damp, base: dampBase, mult: stepEvents.modifiers.dampMult },
        });
      }
    }

    // Save step receipts (top contributions remain visible; UI can sort).
    for (const id of nodeIds) {
      receiptsByNodeByStep[id].push({ nodeId: id, items: stepReceipts[id] });
    }

    // Advance state.
    if (t + 1 < steps) {
      for (const id of nodeIds) S[id][t + 1] = next[id];
    }
  }

  return {
    steps,
    nodeIds,
    seriesByNode: S,
    receiptsByNodeByStep,
  };
}


