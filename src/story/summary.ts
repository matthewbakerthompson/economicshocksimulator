import { summarizeLayers } from "../sim/layers";
import type { CausalEvent, LayerId, NodeId } from "../sim/types";
import { Runs, peakOf, series } from "./runs";
import { banksTightening, foreclosuresAbove, peopleOutOfWork, POINTS_AT_TOP } from "./sources";
import { type Paragraph, countRange, pct, pctRange, people, points, resultPoints, tr } from "./text";
import type { RunSummary } from "./types";

/** A short factual account of any run: what happened, when it peaked, and where it ends. */

const STRESS_NAME: Record<LayerId, string> = {
  Consumers: "household stress",
  Credit: "bank stress",
  Markets: "market stress",
};

const PLAIN_NAME: Record<LayerId, string> = { Consumers: "Households", Credit: "Banks", Markets: "Markets" };

const lastMonth = (e: CausalEvent) => e.startStep + e.durationSteps - 1;

function months(e: CausalEvent): string {
  return e.durationSteps === 1 ? `month ${e.startStep}` : `months ${e.startStep} to ${lastMonth(e)}`;
}

function describeEvent(e: CausalEvent): string {
  switch (e.type) {
    case "unemployment":
      return `unemployment up ${points(e.magnitude)} ${e.magnitude === 1 ? "point" : "points"} over ${months(e)}`;
    case "stagflation":
      return `stagflation at severity ${e.magnitude.toFixed(2)} in ${months(e)}`;
    case "oil_glut":
      return `an oil glut at severity ${e.magnitude.toFixed(2)} in ${months(e)}`;
  }
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function summarize(runs: Runs, reason: RunSummary["reason"]): RunSummary {
  const base = runs.base;
  const L = base.steps - 1;
  const events = runs.scenario.events.filter(
    (e) => e.durationSteps > 0 && e.magnitude > 0 && e.startStep < base.steps
  );
  if (events.length === 0) {
    return {
      kind: "summary",
      reason,
      headline: ["This scenario has no shocks."],
      paragraphs: [["Add one in Explore to see how it spreads."]],
    };
  }

  const paragraphs: Paragraph[] = [[`This run applies ${joinList(events.map(describeEvent))}.`]];
  const layers = summarizeLayers(base);
  const moved = layers.filter((l) => l.material);
  const lags = runs.lagRange();
  const at = (id: NodeId) => series(base, id);

  const u = at("consumers_unemployment");
  const uPeak = peakOf(u);
  const missed = at("consumers_delinquency");
  const mPeak = peakOf(missed);
  const standards = peakOf(at("credit_standards"));

  const people_: Paragraph = [];
  if (uPeak.value * POINTS_AT_TOP >= 0.01) {
    people_.push(
      `Unemployment peaks in month ${uPeak.at} at ${resultPoints(uPeak.value * POINTS_AT_TOP)} points above its starting level: `,
      tr(`about ${people(peopleOutOfWork(uPeak.value))} more people out of work`, "jobs"),
      ". "
    );
    if (uPeak.at < L) {
      people_.push(
        `In month ${L} it is ${resultPoints(u[L] * POINTS_AT_TOP)} points above: `,
        tr(`about ${people(peopleOutOfWork(u[L]))} people`, "jobs"),
        ". "
      );
    }
  }
  if (mPeak.value >= 0.01) {
    people_.push(
      `Missed payments peak in month ${mPeak.at}: `,
      tr(
        `${countRange(foreclosuresAbove(lags.map((r) => peakOf(series(r, "consumers_delinquency")).value)))} more people a quarter get a new foreclosure than before the shocks`,
        "foreclosures"
      ),
      ". "
    );
  }
  if (standards.value >= 0.01) {
    people_.push(
      `Lending is tightest in month ${standards.at}: `,
      tr(
        `a net ${pctRange(banksTightening(lags.map((r) => peakOf(series(r, "credit_standards")).value)))} of banks are tightening standards on loans to small businesses`,
        "lending"
      ),
      ". "
    );
  }
  if (uPeak.value * POINTS_AT_TOP < 0.01 && moved.length) {
    people_.unshift("Unemployment does not change. In this model, only an unemployment shock moves it. ");
  }
  if (people_.length) {
    const lastText = people_[people_.length - 1];
    if (typeof lastText === "string") people_[people_.length - 1] = lastText.trimEnd();
    paragraphs.push(people_);
  }

  const still = layers.filter((l) => !l.material);
  const peaks = moved.map((l, i) =>
    i === 0
      ? `${capitalize(STRESS_NAME[l.layer])} peaks in month ${l.peakAt}`
      : `${STRESS_NAME[l.layer]} in month ${l.peakAt}`
  );
  const layerLine = [
    peaks.length ? `${joinList(peaks)}.` : "",
    still.length
      ? `${joinList(still.map((l, i) => (i === 0 ? PLAIN_NAME[l.layer] : PLAIN_NAME[l.layer].toLowerCase())))} barely ${still.length === 1 ? "moves" : "move"}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (layerLine) paragraphs.push([layerLine]);

  const shocksEnd = Math.max(...events.map(lastMonth));
  if (shocksEnd >= L) {
    paragraphs.push([`The shocks are still running in month ${L}.`]);
  } else if (moved.length) {
    const shares = moved.map((l, i) =>
      i === 0
        ? `${STRESS_NAME[l.layer]} is at ${pct(l.last / l.peak)} of its peak`
        : `${STRESS_NAME[l.layer]} at ${pct(l.last / l.peak)}`
    );
    paragraphs.push([`In month ${L}, ${joinList(shares)}.`]);
  }

  let headline: Paragraph;
  if (uPeak.value * POINTS_AT_TOP >= 0.01) {
    headline = [
      `Unemployment peaks in month ${uPeak.at}, with `,
      tr(`about ${people(peopleOutOfWork(uPeak.value))} more people out of work`, "jobs"),
      ".",
    ];
  } else if (mPeak.value >= 0.01) {
    headline = [`Missed payments peak in month ${mPeak.at}.`];
  } else if (moved.length) {
    const top = [...moved].sort((a, b) => b.peak - a.peak)[0];
    headline = [`${capitalize(STRESS_NAME[top.layer])} peaks in month ${top.peakAt}.`];
  } else {
    headline = ["These shocks barely move the economy."];
    if (events.every((e) => e.type === "oil_glut")) {
      paragraphs.push(["An oil glut removes stress, and this scenario has none for it to remove."]);
    }
  }

  return { kind: "summary", reason, headline, paragraphs };
}
