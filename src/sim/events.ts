import type { CausalEvent, EventType, NodeId, ReceiptItem, Scenario } from "./types";

export function isEventActive(ev: CausalEvent, t: number): boolean {
  return t >= ev.startStep && t < ev.startStep + ev.durationSteps;
}

export function eventLabel(ev: CausalEvent): string {
  switch (ev.type) {
    case "unemployment":
      return `Unemployment +${ev.magnitude.toFixed(1)}pp`;
    case "stagflation":
      return `Stagflation (sev ${ev.magnitude.toFixed(2)})`;
    case "oil_glut":
      return `Oil glut (sev ${ev.magnitude.toFixed(2)})`;
  }
}

export type StepModifiers = {
  edgeWeightMult: number;
  dampMult: number;
};

export type StepEventEffects = {
  injectionsByNode: Record<NodeId, ReceiptItem[]>;
  modifiers: StepModifiers;
  narrativeNotes: string[];
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function ensureNodeMap<T>(nodeIds: NodeId[], init: () => T): Record<NodeId, T> {
  const m = {} as Record<NodeId, T>;
  for (const id of nodeIds) m[id] = init();
  return m;
}

function applyReceipt(map: Record<NodeId, ReceiptItem[]>, nodeId: NodeId, item: ReceiptItem) {
  map[nodeId].push(item);
}

function baseEventInjections(ev: CausalEvent, t: number, interaction: Set<EventType>): Array<{ nodeId: NodeId; item: ReceiptItem }> {
  // Convert user magnitudes into [−1..+1]ish stress adjustments.
  // Positive amount => more stress; negative amount => relief.
  if (ev.type === "unemployment") {
    const amt = clamp01(ev.magnitude / 6); // 0..6pp → 0..1
    return [
      {
        nodeId: "consumers_unemployment",
        item: {
          kind: "shock",
          label: `Event: unemployment (+${ev.magnitude.toFixed(1)}pp)`,
          amount: amt,
          meta: { t, eventId: ev.id, start: ev.startStep, duration: ev.durationSteps },
        },
      },
    ];
  }

  if (ev.type === "stagflation") {
    const sev = clamp01(ev.magnitude);
    return [
      {
        nodeId: "consumers_confidence",
        item: {
          kind: "shock",
          label: "Event: stagflation (confidence pressure)",
          amount: 0.24 * sev,
          meta: { t, eventId: ev.id },
        },
      },
      {
        nodeId: "consumers_demand",
        item: {
          kind: "shock",
          label: "Event: stagflation (demand weakness)",
          amount: 0.26 * sev,
          meta: { t, eventId: ev.id },
        },
      },
      {
        nodeId: "credit_borrow_cost",
        item: {
          kind: "shock",
          label: "Event: stagflation (cost pressure)",
          amount: 0.20 * sev,
          meta: { t, eventId: ev.id },
        },
      },
      {
        nodeId: "markets_risk",
        item: {
          kind: "shock",
          label: "Event: stagflation (risk-off regime)",
          amount: 0.18 * sev,
          meta: { t, eventId: ev.id },
        },
      },
    ];
  }

  // oil_glut: tends to reduce inflation pressure and some risk, but can be muted by stagflation regime.
  if (ev.type === "oil_glut") {
    const sev = clamp01(ev.magnitude);
    const muted = interaction.has("stagflation") ? 0.55 : 1.0;
    const relief = -0.22 * sev * muted;
    const relVol = -0.14 * sev * muted;

    const out: Array<{ nodeId: NodeId; item: ReceiptItem }> = [
      {
        nodeId: "credit_borrow_cost",
        item: {
          kind: "shock",
          label: interaction.has("stagflation")
            ? "Event: oil glut (relief muted by stagflation)"
            : "Event: oil glut (cost relief)",
          amount: relief,
          meta: { t, eventId: ev.id, mutedByStagflation: interaction.has("stagflation") },
        },
      },
      {
        nodeId: "markets_volatility",
        item: {
          kind: "shock",
          label: interaction.has("stagflation")
            ? "Event: oil glut (volatility relief muted)"
            : "Event: oil glut (volatility relief)",
          amount: relVol,
          meta: { t, eventId: ev.id, mutedByStagflation: interaction.has("stagflation") },
        },
      },
      {
        nodeId: "markets_liquidity",
        item: {
          kind: "shock",
          label: "Event: oil glut (liquidity easing)",
          amount: -0.10 * sev * muted,
          meta: { t, eventId: ev.id },
        },
      },
    ];

    // If stagflation is active, add a small “whiplash” note effect (not huge, but visible).
    if (interaction.has("stagflation")) {
      out.push({
        nodeId: "markets_risk",
        item: {
          kind: "shock",
          label: "Interaction: policy/market uncertainty (oil glut in stagflation)",
          amount: 0.06 * sev,
          meta: { t, eventId: ev.id, interactsWith: "stagflation" },
        },
      });
    }

    return out;
  }

  return [];
}

export function buildStepEventEffects(args: {
  scenario: Scenario;
  t: number;
  nodeIds: NodeId[];
}): StepEventEffects {
  const { scenario, t, nodeIds } = args;
  const injectionsByNode = ensureNodeMap(nodeIds, () => []);

  const active = scenario.events.filter((ev) => isEventActive(ev, t));
  const activeTypes = new Set<EventType>(active.map((a) => a.type));

  const narrativeNotes: string[] = [];
  if (active.length > 0) narrativeNotes.push(`Active events: ${active.map(eventLabel).join(" • ")}`);

  // Base modifiers
  let edgeWeightMult = 1.0;
  let dampMult = 1.0;

  // Regime modifiers (simple but useful for combos)
  if (activeTypes.has("stagflation")) {
    // In stagflation, stress tends to persist and transmit more sharply.
    dampMult *= 0.86; // less decay => more persistence
    edgeWeightMult *= 1.08;
  }

  // Apply injections
  for (const ev of active) {
    const inj = baseEventInjections(ev, t, activeTypes);
    for (const { nodeId, item } of inj) applyReceipt(injectionsByNode, nodeId, item);
  }

  // Interaction narrative note for an explicit example:
  if (activeTypes.has("oil_glut") && activeTypes.has("stagflation")) {
    narrativeNotes.push("Interaction: oil glut relief is muted under stagflation; some risk uncertainty remains elevated.");
  }

  return { injectionsByNode, modifiers: { edgeWeightMult, dampMult }, narrativeNotes };
}



