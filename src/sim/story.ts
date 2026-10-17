import { NODES } from "./graphSpec";
import { isEventActive } from "./events";
import type { CausalEvent, EventType, NodeId, Scenario, SimulationResult } from "./types";

/** The month's one-line story: the biggest move and what the events are doing. */
export type MonthStory = {
  t: number;
  headline: string;
  detail: string;
  activeEvents: CausalEvent[];
  topMover: { nodeId: NodeId; delta: number } | null;
};

// Node labels that read as plural ("Bank losses rise", not "rises").
const PLURAL = new Set<NodeId>([
  "consumers_delinquency",
  "credit_bank_losses",
  "credit_standards",
  "credit_borrow_cost",
]);

// Moves smaller than this round to 0.000 and aren't worth a headline.
const MIN_MOVE = 0.0005;

export function nodeLabel(nodeId: NodeId): string {
  return NODES.find((n) => n.id === nodeId)?.label ?? nodeId;
}

export function eventName(type: EventType): string {
  switch (type) {
    case "unemployment":
      return "Unemployment";
    case "stagflation":
      return "Stagflation";
    case "oil_glut":
      return "Oil glut";
  }
}

/** Signed, three decimals, with a true minus sign. */
export function fmtDelta(d: number): string {
  const s = Math.abs(d).toFixed(3);
  return d < 0 && s !== "0.000" ? `−${s}` : `+${s}`;
}

function sentenceCase(label: string): string {
  const [first, ...rest] = label.split(" ");
  return [first, ...rest.map((w) => w.toLowerCase())].join(" ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function eventPhrase(ev: CausalEvent): string {
  switch (ev.type) {
    case "unemployment":
      return `unemployment +${ev.magnitude.toFixed(1)}pp`;
    case "stagflation":
      return `stagflation (severity ${ev.magnitude.toFixed(2)})`;
    case "oil_glut":
      return `an oil glut (severity ${ev.magnitude.toFixed(2)})`;
  }
}

function eventShortName(ev: CausalEvent): string {
  return ev.type === "oil_glut" ? "the oil glut" : eventName(ev.type).toLowerCase();
}

function lastMonth(ev: CausalEvent): number {
  return ev.startStep + ev.durationSteps - 1;
}

export function describeMonth(result: SimulationResult, scenario: Scenario, t: number): MonthStory {
  const S = result.seriesByNode;
  const events = scenario.events.filter((e) => e.durationSteps > 0 && e.magnitude > 0);
  const activeEvents = events.filter((e) => isEventActive(e, t));

  let topMover: MonthStory["topMover"] = null;
  if (t > 0) {
    for (const id of result.nodeIds) {
      const delta = (S[id][t] ?? 0) - (S[id][t - 1] ?? 0);
      if (!topMover || Math.abs(delta) > Math.abs(topMover.delta)) topMover = { nodeId: id, delta };
    }
    if (topMover && Math.abs(topMover.delta) < MIN_MOVE) topMover = null;
  }

  let headline: string;
  if (t === 0) headline = "The system starts at rest";
  else if (!topMover) headline = "Little moves this month";
  else {
    const name = sentenceCase(nodeLabel(topMover.nodeId));
    const plural = PLURAL.has(topMover.nodeId);
    headline =
      topMover.delta > 0
        ? `${name} ${plural ? "rise" : "rises"} fastest, ${fmtDelta(topMover.delta)}`
        : `${name} ${plural ? "ease" : "eases"} most, ${fmtDelta(topMover.delta)}`;
  }

  let detail: string;
  if (events.length === 0) {
    detail = "No events in this scenario. Add one to see how a shock spreads.";
  } else if (activeEvents.length > 0) {
    detail = `Active: ${joinList(activeEvents.map(eventPhrase))}.`;
    const types = new Set(activeEvents.map((e) => e.type));
    if (types.has("stagflation") && types.has("oil_glut")) detail += " Stagflation mutes the oil glut's relief.";
  } else {
    const ended = events.filter((e) => lastMonth(e) < t).sort((a, b) => lastMonth(a) - lastMonth(b));
    const upcoming = events.filter((e) => e.startStep > t).sort((a, b) => a.startStep - b.startStep);
    if (ended.length === 0) {
      detail = `Nothing has happened yet. ${capitalize(eventPhrase(upcoming[0]))} starts in month ${upcoming[0].startStep}.`;
    } else {
      detail = `${capitalize(joinList(ended.map(eventShortName)))} ended by month ${lastMonth(ended[ended.length - 1])}.`;
      if (upcoming.length > 0) {
        detail += ` ${capitalize(eventPhrase(upcoming[0]))} starts in month ${upcoming[0].startStep}.`;
      } else {
        detail += topMover
          ? " Stress is still moving on its own, through the lags."
          : " The system is settling back toward zero.";
      }
    }
  }

  return { t, headline, detail, activeEvents, topMover };
}
