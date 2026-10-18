import { EDGES, NODES } from "./graphSpec";
import { dampeningStrength } from "./engine";
import type { CausalEvent, EventType, LayerId, NodeId, Scenario, SimulationResult } from "./types";

/**
 * The run told as a story: a title that states the finding, a framing line, and chapters
 * computed from the data. Every number in the text comes from the run.
 */

export type LayerSummary = {
  layer: LayerId;
  name: string;
  /** The layer's mean stress, month by month. */
  series: number[];
  peak: number;
  peakAt: number;
  /** First month the layer reaches a quarter of its peak. */
  start: number;
  /** Stress in the last month. */
  last: number;
  /** Whether the layer moves enough to talk about. */
  material: boolean;
};

export type Chapter = {
  id: string;
  title: string;
  body: string;
  /** The months the chapter covers, inclusive. */
  from: number;
  to: number;
  layer?: LayerId;
};

export type Narrative = {
  title: string;
  dek: string;
  chapters: Chapter[];
  layers: LayerSummary[];
};

export const LAYER_ORDER: LayerId[] = ["Consumers", "Credit", "Markets"];

export const LAYER_NAMES: Record<LayerId, string> = {
  Consumers: "Households",
  Credit: "Banks and credit",
  Markets: "Markets",
};

// Below this a layer's stress is too small to talk about.
const MATERIAL = 0.03;
// Below this the banks are "barely" reached.
const SERIOUS = 0.1;

const WORDS: Record<LayerId, { adj: string; who: string; peaks: string }> = {
  Consumers: { adj: "Household", who: "households", peaks: "Households peak" },
  Credit: { adj: "Bank", who: "the banks", peaks: "The banks peak" },
  Markets: { adj: "Market", who: "markets", peaks: "Markets peak" },
};

// What each event does on impact, before any channel carries it further.
const DIRECT: Record<EventType, string> = {
  unemployment: "Job losses squeeze household incomes first.",
  stagflation: "Stagflation hits confidence, spending, borrowing costs and risk aversion at once.",
  oil_glut: "The oil glut eases borrowing costs, volatility and liquidity",
};

const LAG_WORDS = ["zero", "one", "two", "three", "four"];

const NUMBERS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

const label = (id: NodeId) => NODES.find((n) => n.id === id)?.label ?? id;
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const f2 = (x: number) => x.toFixed(2);
const months = (n: number) => (n === 1 ? "a month" : `${n} months`);

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function points(x: number): string {
  const v = Number.isInteger(x) ? String(x) : x.toFixed(1);
  return `${v} point${x === 1 ? "" : "s"}`;
}

function lastMonth(e: CausalEvent): number {
  return e.startStep + e.durationSteps - 1;
}

/** "unemployment jumps 1.5 points from month 2" */
function eventClause(e: CausalEvent): string {
  const when = e.startStep === 0 ? "from the start" : `from month ${e.startStep}`;
  switch (e.type) {
    case "unemployment":
      return `unemployment jumps ${points(e.magnitude)} ${when}`;
    case "stagflation":
      return e.startStep === 0
        ? "stagflation sets in from the start"
        : `stagflation sets in at month ${e.startStep}`;
    case "oil_glut":
      return e.startStep === 0
        ? "an oil glut runs from the start"
        : `an oil glut arrives in month ${e.startStep}`;
  }
}

function shockName(events: CausalEvent[]): { name: string; plural: boolean } {
  if (events.length > 1)
    return { name: `${NUMBERS[events.length] ?? events.length} overlapping shocks`, plural: true };
  const e = events[0];
  switch (e.type) {
    case "unemployment":
      return {
        name: `A ${points(e.magnitude).replace(" points", "-point").replace(" point", "-point")} jump in unemployment`,
        plural: false,
      };
    case "stagflation":
      return { name: "Stagflation", plural: false };
    case "oil_glut":
      return { name: "An oil glut", plural: false };
  }
}

function eventNameOf(type: EventType): string {
  return type === "oil_glut"
    ? "The oil glut"
    : type === "stagflation"
      ? "Stagflation"
      : "The unemployment shock";
}

export function summarizeLayers(result: SimulationResult): LayerSummary[] {
  return LAYER_ORDER.map((layer) => {
    const ids = NODES.filter((n) => n.layer === layer).map((n) => n.id);
    const series = Array.from(
      { length: result.steps },
      (_, t) => ids.reduce((sum, id) => sum + (result.seriesByNode[id][t] ?? 0), 0) / ids.length
    );
    const peak = Math.max(...series);
    const peakAt = series.indexOf(peak);
    const start = peak > 0 ? series.findIndex((v) => v >= 0.25 * peak) : -1;
    return {
      layer,
      name: LAYER_NAMES[layer],
      series,
      peak,
      peakAt,
      start,
      last: series[series.length - 1],
      material: peak >= MATERIAL,
    };
  });
}

/**
 * What carried the most new stress into a layer over some months, as a sentence. Channels beat
 * events when they carry at least a quarter as much, because how stress travels is the story;
 * channels from other layers beat channels inside the layer on the same terms.
 */
function mainDriver(
  result: SimulationResult,
  scenario: Scenario,
  layer: LayerId,
  from: number,
  to: number
): string | null {
  const inLayer = new Set(NODES.filter((n) => n.layer === layer).map((n) => n.id));
  const totals = {
    cross: new Map<string, number>(),
    inner: new Map<string, number>(),
    shock: new Map<string, number>(),
  };
  for (const id of inLayer) {
    for (let t = Math.max(0, from - 1); t < Math.min(result.steps, to); t++) {
      for (const it of result.receiptsByNodeByStep[id][t]?.items ?? []) {
        if (it.amount <= 0) continue;
        const src = String(it.meta?.from ?? it.meta?.eventId ?? "");
        const bucket =
          it.kind === "edge"
            ? inLayer.has(src as NodeId)
              ? totals.inner
              : totals.cross
            : it.kind === "shock" && it.meta?.eventId
              ? totals.shock
              : null;
        if (bucket) bucket.set(`${src}>${id}`, (bucket.get(`${src}>${id}`) ?? 0) + it.amount);
      }
    }
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  const [cross, inner, shock] = [top(totals.cross), top(totals.inner), top(totals.shock)];
  const pick =
    cross[1] > 0 && cross[1] >= 0.25 * Math.max(inner[1], shock[1])
      ? { kind: "edge", key: cross[0] }
      : inner[1] > 0 && inner[1] >= 0.25 * shock[1]
        ? { kind: "edge", key: inner[0] }
        : shock[1] > 0
          ? { kind: "shock", key: shock[0] }
          : null;
  if (!pick) return null;
  const [src, dest] = pick.key.split(">");
  if (pick.kind === "edge") {
    const e = EDGES.find((x) => x.from === src && x.to === dest);
    return e ? `${e.label}, with a ${LAG_WORDS[e.typicalLag] ?? e.typicalLag}-month lag.` : null;
  }
  const ev = scenario.events.find((e) => e.id === src);
  return ev ? `${eventNameOf(ev.type)} drives ${lower(label(dest as NodeId))} directly.` : null;
}

function topNode(result: SimulationResult, layer: LayerId, t: number): { id: NodeId; value: number } {
  return NODES.filter((n) => n.layer === layer)
    .map((n) => ({ id: n.id, value: result.seriesByNode[n.id][t] ?? 0 }))
    .sort((a, b) => b.value - a.value)[0];
}

export function buildNarrative(result: SimulationResult, scenario: Scenario): Narrative {
  const H = result.steps;
  const last = H - 1;
  const events = scenario.events
    .filter((e) => e.durationSteps > 0 && e.magnitude > 0 && e.startStep < H)
    .sort((a, b) => a.startStep - b.startStep);
  const layers = summarizeLayers(result);
  const byLayer = Object.fromEntries(layers.map((l) => [l.layer, l])) as Record<LayerId, LayerSummary>;
  const dek = `Stress on 14 parts of the economy over ${H} months, from 0 (calm) to 1 (severe). It is a model of how stress travels, not a forecast.`;

  if (events.length === 0) {
    return {
      title: "Add a shock to see how it spreads",
      dek,
      layers,
      chapters: [
        {
          id: "empty",
          title: "Nothing has happened",
          body: "This scenario has no events, so every part of the economy stays calm. Add an event, or pick a preset.",
          from: 0,
          to: last,
        },
      ],
    };
  }

  const s0 = events[0].startStep;
  const eN = Math.min(last, Math.max(...events.map(lastMonth)));
  const framing = `${capitalize(joinList(events.map(eventClause)))}.`;
  const { name, plural } = shockName(events);
  const credit = byLayer.Credit;
  const households = byLayer.Consumers;

  if (layers.every((l) => !l.material)) {
    const onlyRelief = events.every((e) => e.type === "oil_glut");
    return {
      title: onlyRelief
        ? "An oil glut on its own changes nothing: the economy starts calm, so there is no stress to relieve"
        : `${name} barely ${plural ? "move" : "moves"} the economy`,
      dek,
      layers,
      chapters: [
        {
          id: "calm",
          title: "Nothing much happens",
          body: onlyRelief
            ? `${framing} Cheaper oil eases borrowing costs, volatility and liquidity, but none of them was under stress. Pair it with stagflation to see the relief at work.`
            : `${framing} No part of the economy gets past ${f2(Math.max(...layers.map((l) => l.peak)))}.`,
          from: s0,
          to: last,
        },
      ],
    };
  }

  // The finding: how fast the shock reaches the banks, and how long it lingers there.
  let title: string;
  if (credit.peak >= SERIOUS) {
    const reach = Math.max(1, credit.start - s0);
    const after = last - eN;
    const share = Math.round((credit.last / credit.peak) * 100);
    title =
      `${name} ${plural ? "reach" : "reaches"} the banks within ${months(reach)}` +
      (after > 0
        ? `, and ${after} months after ${plural ? "they end" : "it ends"}, bank stress is still ${share}% of its peak`
        : `, and bank stress is still ${credit.peakAt === last ? "climbing" : "high"} at month ${last}`);
  } else {
    const hard = households.peak >= 0.15 ? " hard" : "";
    title = `${name} ${plural ? "hit" : "hits"} households${hard} but barely ${plural ? "reach" : "reaches"} the banks: bank stress peaks at ${f2(credit.peak)} in month ${credit.peakAt}`;
  }

  // Beats in time order: the shock lands, each layer peaks, then the aftermath.
  const chapters: Chapter[] = [];
  const peaks = layers
    .filter((l) => l.material)
    .sort((a, b) => a.peakAt - b.peakAt || LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer));
  const firstPeak = peaks[0].peakAt;

  // With stagflation in the mix, its direct hits are the headline; the job-loss channel shows up later.
  const types = [...new Set(events.map((e) => e.type))];
  const direct = types
    .filter((type) => !(type === "unemployment" && types.includes("stagflation")))
    .map((type) =>
      type === "oil_glut" && events.some((e) => e.type === "stagflation")
        ? `${DIRECT.oil_glut}, though stagflation mutes the relief.`
        : type === "oil_glut"
          ? `${DIRECT.oil_glut}.`
          : DIRECT[type]
    );
  const movers = layers.filter((l) => l.material && l.start === Math.min(...peaks.map((p) => p.start)));
  const firstMovers = `${capitalize(joinList(movers.map((l) => WORDS[l.layer].who)))} turn first.`;
  const introEnd = Math.max(s0, Math.min(eN, firstPeak - 1));
  chapters.push({
    id: "shock",
    title: events.length > 1 ? "The shocks land" : "The shock lands",
    body: [framing, ...direct, firstMovers].join(" "),
    from: s0,
    to: introEnd,
  });

  let prev = introEnd;
  let prevLayer: LayerSummary | null = null;
  for (const l of peaks) {
    const from = Math.min(last, prev + 1);
    const to = Math.max(from, l.peakAt);
    const top = topNode(result, l.layer, l.peakAt);
    const driver = mainDriver(result, scenario, l.layer, Math.max(s0, l.start), l.peakAt);
    const relation = !prevLayer
      ? ""
      : l.peakAt === prevLayer.peakAt
        ? `, the same month as ${WORDS[prevLayer.layer].who}`
        : `, ${months(l.peakAt - prevLayer.peakAt)} after ${WORDS[prevLayer.layer].who}`;
    chapters.push({
      id: l.layer,
      layer: l.layer,
      title: `${WORDS[l.layer].peaks} in month ${l.peakAt}`,
      body: [
        driver,
        `${WORDS[l.layer].adj} stress reaches ${f2(l.peak)}${relation}.`,
        `Hardest hit: ${lower(label(top.id))}, at ${f2(top.value)}.`,
      ]
        .filter(Boolean)
        .join(" "),
      from,
      to,
    });
    prev = to;
    prevLayer = l;
  }

  const quiet = layers.filter((l) => !l.material);
  const quietLines = quiet.map(
    (l) =>
      `${capitalize(WORDS[l.layer].who)} barely notice: ${lower(WORDS[l.layer].adj)} stress never gets past ${f2(l.peak)}.`
  );

  if (eN >= last) {
    // The shocks outlast the run, so there is no aftermath to tell yet.
    const note = `The shocks are still running in month ${last}. Lengthen the horizon or shorten the events to see the recovery.`;
    if (prev < last) {
      chapters.push({
        id: "unfolding",
        title: "Still unfolding",
        body: [...quietLines, note].join(" "),
        from: prev + 1,
        to: last,
      });
    } else {
      const end = chapters[chapters.length - 1];
      end.body = [end.body, ...quietLines, note].join(" ");
    }
  } else if (prev < last) {
    const shown = layers.filter((l) => l.material);
    const lines = shown.map(
      (l) =>
        `${lower(WORDS[l.layer].adj)} stress is at ${f2(l.last)} (${Math.round((l.last / l.peak) * 100)}% of its peak)`
    );
    const slow = shown.some((l) => l.last / l.peak > 0.5);
    const buffers = Math.round(dampeningStrength(scenario.bufferPreset) * 1000) / 10;
    chapters.push({
      id: "aftermath",
      title: "The aftermath",
      body: [
        `The shocks end in month ${eN}, but stress keeps moving through the lags.`,
        ...quietLines,
        `By month ${last}, ${joinList(lines)}.`,
        slow
          ? `Recovery is slow: buffers absorb only ${buffers}% of each node's stress a month.`
          : "The system is settling back toward calm.",
      ].join(" "),
      from: prev + 1,
      to: last,
    });
  } else {
    // The last layer peaks in the final month: the run ends at its height.
    const end = chapters[chapters.length - 1];
    end.body = [
      end.body,
      ...quietLines,
      `Stress is still at its height when the run ends in month ${last}.`,
    ].join(" ");
  }

  return { title, dek, chapters, layers };
}
