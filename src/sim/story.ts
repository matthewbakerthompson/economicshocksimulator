import { NODES } from "./graphSpec";
import type { NodeId, ReceiptItem, Scenario, SimulationResult } from "./types";
import { buildStepEventEffects, isEventActive, eventLabel } from "./events";

export type StoryBeat = {
  t: number;
  headline: string;
  bullets: string[];
  movers: Array<{ nodeId: NodeId; label: string; delta: number; value: number }>;
};

function labelFor(nodeId: NodeId): string {
  return NODES.find((n) => n.id === nodeId)?.label ?? nodeId;
}

function fmtDelta(d: number): string {
  const sign = d >= 0 ? "+" : "";
  return `${sign}${d.toFixed(3)}`;
}

function topDrivers(receipts: ReceiptItem[], max = 2): string[] {
  const drivers = receipts
    .filter((r) => r.kind === "shock" || r.kind === "edge")
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, max);
  return drivers.map((d) => `${d.label} (${fmtDelta(d.amount)})`);
}

export function buildStory(args: { result: SimulationResult; scenario: Scenario }): StoryBeat[] {
  const { result, scenario } = args;
  const beats: StoryBeat[] = [];

  const steps = result.steps;
  const ids = result.nodeIds;

  for (let t = 0; t < steps; t++) {
    const activeEvents = scenario.events.filter((e) => isEventActive(e, t));
    const movers = ids
      .map((id) => {
        const now = result.seriesByNode[id][t] ?? 0;
        const prev = t > 0 ? (result.seriesByNode[id][t - 1] ?? 0) : 0;
        return { nodeId: id, label: labelFor(id), delta: now - prev, value: now };
      })
      .filter((m) => Math.abs(m.delta) > 0.0005)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 4);

    const shockEvents = activeEvents.filter((e) => e.type === "unemployment");
    const shockActive = shockEvents.length > 0;
    const shockStarts = scenario.events.some((e) => e.type === "unemployment" && t === e.startStep);
    const shockEnds = scenario.events.some((e) => e.type === "unemployment" && t === e.startStep + e.durationSteps);

    let headline = "System update";
    if (t === 0) headline = "Baseline: system at rest";
    else if (shockStarts) headline = "Shock injected: unemployment pressure rises";
    else if (shockActive) headline = "Shock persists: stress continues to propagate";
    else if (shockEnds) headline = "Shock ends: propagation continues via lagged channels";
    else if (movers.length > 0) headline = `Largest move: ${movers[0].label} (${fmtDelta(movers[0].delta)})`;

    const bullets: string[] = [];

    if (activeEvents.length > 0) {
      bullets.push(`Active events: ${activeEvents.map(eventLabel).join(" • ")}`);
      const stepEffects = buildStepEventEffects({ scenario, t, nodeIds: result.nodeIds });
      for (const note of stepEffects.narrativeNotes) bullets.push(note);
    }

    if (movers.length > 0) {
      const moversLine = movers
        .slice(0, 3)
        .map((m) => `${m.label} ${fmtDelta(m.delta)} → ${m.value.toFixed(3)}`)
        .join(" • ");
      bullets.push(`Top movers: ${moversLine}`);

      const focus = movers[0].nodeId;
      const receipts = result.receiptsByNodeByStep[focus]?.[t]?.items ?? [];
      const drivers = topDrivers(receipts, 3);
      if (drivers.length > 0) bullets.push(`Drivers for ${labelFor(focus)}: ${drivers.join(" • ")}`);
    } else {
      bullets.push("Minimal movement this month (buffers/decay dominate).");
    }

    // Simple loop hints (keeps it explainable without pretending precision).
    const risk = result.seriesByNode["markets_risk"]?.[t] ?? 0;
    const liq = result.seriesByNode["markets_liquidity"]?.[t] ?? 0;
    const std = result.seriesByNode["credit_standards"]?.[t] ?? 0;
    const del = result.seriesByNode["consumers_delinquency"]?.[t] ?? 0;

    if (risk > 0.25 && liq > 0.25) bullets.push("Loop watch: risk-off → liquidity stress is reinforcing market pressure.");
    if (std > 0.25 && del > 0.25) bullets.push("Loop watch: tighter credit → higher delinquencies → more loss pressure.");

    beats.push({ t, headline, bullets, movers });
  }

  return beats;
}


