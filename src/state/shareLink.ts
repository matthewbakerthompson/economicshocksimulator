import { NODES } from "../sim/graphSpec";
import { PRESETS } from "../sim/presets";
import type { BufferPreset, CausalEvent, EventType, LagPreset, NodeId, Scenario } from "../sim/types";

/**
 * A scenario in the URL hash, readable by eye:
 *
 *   #view=explore&events=s0.65@0-9,o0.7@3-7,u1.5@2-7&lags=medium&buffers=medium&horizon=24&month=12&node=consumers_delinquency
 *
 * Each event is a type letter (u, s, o), its magnitude, and its first and last month.
 * Decoding never throws: anything missing or invalid falls back to the default. Links from
 * before the story view existed have no `view` and open in the explorer, where they were made.
 */
export type Mode = "story" | "explore";

export type ShareState = {
  mode: Mode;
  scenario: Scenario;
  steps: number;
  t: number;
  selectedNodeId: NodeId;
};

export type DecodedLink = ShareState & { presetId: string; hasMonth: boolean };

const CODES: Record<EventType, string> = { unemployment: "u", stagflation: "s", oil_glut: "o" };
const TYPES = Object.fromEntries(Object.entries(CODES).map(([type, code]) => [code, type])) as Record<
  string,
  EventType
>;
const MAX_MAGNITUDE: Record<EventType, number> = { unemployment: 6, stagflation: 1, oil_glut: 1 };
const LAGS: LagPreset[] = ["short", "medium", "long"];
const BUFFERS: BufferPreset[] = ["low", "medium", "high"];
export const LINK_HORIZONS = [12, 18, 24];
const MAX_EVENTS = 12;
const EVENT_RE = /^([uso])(\d+(?:\.\d+)?)@(\d+)-(\d+)$/;

function round(x: number): string {
  return String(Math.round(x * 100) / 100);
}

export function encodeShareHash(s: ShareState): string {
  const events = s.scenario.events
    .filter((e) => e.durationSteps > 0)
    .map((e) => `${CODES[e.type]}${round(e.magnitude)}@${e.startStep}-${e.startStep + e.durationSteps - 1}`)
    .join(",");
  return (
    `#view=${s.mode}&events=${events}&lags=${s.scenario.lagPreset}&buffers=${s.scenario.bufferPreset}` +
    `&horizon=${s.steps}&month=${s.t}&node=${s.selectedNodeId}`
  );
}

function decodeEvents(raw: string, steps: number): CausalEvent[] | null {
  if (raw === "") return [];
  const tokens = raw.split(",");
  if (tokens.length > MAX_EVENTS) return null;
  const events: CausalEvent[] = [];
  for (const [i, token] of tokens.entries()) {
    const m = EVENT_RE.exec(token.trim());
    if (!m) return null;
    const type = TYPES[m[1]];
    const start = Number(m[3]);
    const end = Number(m[4]);
    if (start >= steps || end < start) return null;
    events.push({
      id: `link_${i}`,
      type,
      magnitude: Math.min(MAX_MAGNITUDE[type], Number(m[2])),
      startStep: start,
      durationSteps: Math.min(end, steps - 1) - start + 1,
    });
  }
  return events;
}

const sameEvents = (a: CausalEvent[], b: CausalEvent[]) =>
  a.length === b.length &&
  a.every(
    (e, i) =>
      e.type === b[i].type &&
      Math.abs(e.magnitude - b[i].magnitude) < 1e-9 &&
      e.startStep === b[i].startStep &&
      e.durationSteps === b[i].durationSteps
  );

/** Reads a hash written by encodeShareHash. Returns null when the hash holds no scenario. */
export function decodeShareHash(hash: string, fallback: ShareState): DecodedLink | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (!params.has("events")) return null;

  const horizon = Number(params.get("horizon"));
  const steps = LINK_HORIZONS.includes(horizon) ? horizon : fallback.steps;
  const events = decodeEvents(params.get("events") ?? "", steps) ?? fallback.scenario.events;
  const lag = params.get("lags") as LagPreset;
  const buffers = params.get("buffers") as BufferPreset;
  const month = Number(params.get("month"));
  const hasMonth = params.has("month") && Number.isInteger(month) && month >= 0;
  const node = params.get("node") as NodeId;

  const preset = PRESETS.find((p) => sameEvents(p.events, events));
  const view = params.get("view");
  return {
    mode: view === "story" ? "story" : "explore",
    scenario: {
      events: preset ? preset.events : events,
      lagPreset: LAGS.includes(lag) ? lag : fallback.scenario.lagPreset,
      bufferPreset: BUFFERS.includes(buffers) ? buffers : fallback.scenario.bufferPreset,
    },
    steps,
    t: hasMonth ? Math.min(month, steps - 1) : fallback.t,
    selectedNodeId: NODES.some((n) => n.id === node) ? node : fallback.selectedNodeId,
    presetId: preset ? preset.id : "custom",
    hasMonth,
  };
}
