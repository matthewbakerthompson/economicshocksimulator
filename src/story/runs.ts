import { simulateScenario } from "../sim/engine";
import { FEEDBACK_EDGES } from "../sim/graphSpec";
import { type LayerSummary, summarizeLayers } from "../sim/layers";
import type { EventType, LayerId, NodeId, Scenario, SimulationResult } from "../sim/types";

/**
 * A scenario's run and the reruns a story compares it with. Each run takes well under a
 * millisecond, so they are made on demand and kept.
 */
export class Runs {
  private cache = new Map<string, SimulationResult>();

  constructor(
    readonly scenario: Scenario,
    readonly steps: number
  ) {}

  private run(key: string, scenario: Scenario, omitEdges?: readonly string[]): SimulationResult {
    let r = this.cache.get(key);
    if (!r) {
      r = simulateScenario(scenario, this.steps, { omitEdges });
      this.cache.set(key, r);
    }
    return r;
  }

  get base(): SimulationResult {
    return this.run("base", this.scenario);
  }

  with(patch: Partial<Scenario>): SimulationResult {
    return this.run(`with:${JSON.stringify(patch)}`, { ...this.scenario, ...patch });
  }

  withoutEvents(type: EventType): SimulationResult {
    return this.run(`without:${type}`, {
      ...this.scenario,
      events: this.scenario.events.filter((e) => e.type !== type),
    });
  }

  /** The run with the channels that close every loop left out. */
  withoutFeedback(): SimulationResult {
    return this.run("no-feedback", this.scenario, FEEDBACK_EDGES);
  }

  /** The run under short, the scenario's own, and long lags. */
  lagRange(): SimulationResult[] {
    return [this.with({ lagPreset: "short" }), this.base, this.with({ lagPreset: "long" })];
  }
}

export type Peak = { value: number; at: number };

export const series = (r: SimulationResult, id: NodeId): number[] => r.seriesByNode[id];

export function peakOf(s: readonly number[]): Peak {
  const value = Math.max(...s);
  return { value, at: s.indexOf(value) };
}

export const layerOf = (r: SimulationResult, layer: LayerId): LayerSummary =>
  summarizeLayers(r).find((l) => l.layer === layer)!;

/** The first month a series reaches `level`, or -1. */
export const firstAt = (s: readonly number[], level: number): number => s.findIndex((v) => v >= level);

/** The last month a series is at or above `level`, or -1. */
export function lastAt(s: readonly number[], level: number): number {
  for (let t = s.length - 1; t >= 0; t--) if (s[t] >= level) return t;
  return -1;
}

/**
 * Where a node's new stress came from over some months, as shares of the total: each source
 * node of an incoming channel, and "event" for shocks. Receipts for month t explain the move
 * into month t + 1, so months `from` to `to` cover the moves into from + 1 … to + 1.
 */
export function sharesInto(r: SimulationResult, id: NodeId, from: number, to: number): Map<string, number> {
  const totals = new Map<string, number>();
  for (let t = from; t <= Math.min(to, r.steps - 1); t++) {
    for (const it of r.receiptsByNodeByStep[id][t]?.items ?? []) {
      if (it.amount <= 0) continue;
      const key =
        it.kind === "edge"
          ? String(it.meta?.from)
          : it.kind === "shock" && it.meta?.kind !== "note"
            ? "event"
            : null;
      if (key) totals.set(key, (totals.get(key) ?? 0) + it.amount);
    }
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return new Map([...totals].map(([k, v]) => [k, sum > 0 ? v / sum : 0]));
}
