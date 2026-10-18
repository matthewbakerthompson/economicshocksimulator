import type { CausalEvent, EventType, NodeId } from "../sim/types";
import { Runs, firstAt, lastAt, layerOf, peakOf, series, sharesInto } from "./runs";
import { banksTightening, foreclosuresAbove, peopleOutOfWork, POINTS_AT_TOP } from "./sources";
import { countRange, pct, pctLower, pctRange, people, points, resultPoints, tr } from "./text";
import type { WrittenStory } from "./types";

/**
 * The written stories. The prose is fixed; every number in it comes from the run, so a change
 * to the model changes the numbers, and the checks (and the tests) catch a change that would
 * make the words wrong.
 */

const UNEMPLOYMENT: NodeId = "consumers_unemployment";
const MISSED: NodeId = "consumers_delinquency";
const LOSSES: NodeId = "credit_bank_losses";
const STANDARDS: NodeId = "credit_standards";
const SQUEEZE: NodeId = "credit_access";

const lastMonth = (e: CausalEvent) => e.startStep + e.durationSteps - 1;

function eventOf(runs: Runs, type: EventType): CausalEvent {
  const e = runs.scenario.events.find((x) => x.type === type);
  if (!e) throw new Error(`The story needs a ${type} event.`);
  return e;
}

function stagflationMeetsOilGlut(runs: Runs): WrittenStory {
  const base = runs.base;
  const L = base.steps - 1;
  const stag = eventOf(runs, "stagflation");
  const oil = eventOf(runs, "oil_glut");
  const job = eventOf(runs, "unemployment");
  const shocksEnd = Math.max(...runs.scenario.events.map(lastMonth));

  const conf = series(base, "consumers_confidence");
  const demand = series(base, "consumers_demand");
  const confLow = Math.max(...conf) - 1e-9;
  const demandLow = Math.max(...demand) - 1e-9;
  const lowFrom = Math.max(firstAt(conf, confLow), firstAt(demand, demandLow));
  const lowTo = Math.min(lastAt(conf, confLow), lastAt(demand, demandLow));
  const firstMove = Math.min(firstAt(conf, 1e-6), firstAt(demand, 1e-6));
  const cost = peakOf(series(base, "credit_borrow_cost"));
  const into = sharesInto(base, MISSED, 0, shocksEnd);
  const fromCost = into.get("credit_borrow_cost") ?? 0;
  const fromIncome = into.get("consumers_income") ?? 0;

  const u = series(base, UNEMPLOYMENT);
  const uPeak = peakOf(u);

  const noOil = runs.withoutEvents("oil_glut");
  const banks = layerOf(base, "Credit");
  const banksNoOil = layerOf(noOil, "Credit");
  const missed = series(base, MISSED);
  const mPeak = peakOf(missed);
  const mPeakNoOil = peakOf(series(noOil, MISSED)).value;

  const lags = runs.lagRange();
  const foreclosuresAtPeak = foreclosuresAbove(lags.map((r) => peakOf(series(r, MISSED)).value));
  const losses = series(base, LOSSES);
  const lossesStart = firstAt(losses, 0.005);
  const lossesPeak = peakOf(losses);
  const standards = peakOf(series(base, STANDARDS));
  const tightening = banksTightening(lags.map((r) => peakOf(series(r, STANDARDS)).value));
  const squeeze = series(base, SQUEEZE);
  const squeezePeak = peakOf(squeeze);

  const noLoop = series(runs.withoutFeedback(), MISSED);
  const foreclosuresAtEnd = foreclosuresAbove(lags.map((r) => series(r, MISSED)[L]));

  const high = runs.with({ bufferPreset: "high" });
  const missedHigh = series(high, MISSED);
  const fewerAtEnd = peopleOutOfWork(u[L] - series(high, UNEMPLOYMENT)[L]);
  const endShare = missed[L] / mPeak.value;

  return {
    kind: "written",
    headline: [
      `Two years after stagflation sets in, missed payments are still at ${pct(endShare)} of their peak.`,
    ],
    dek: [
      `Prices rise while growth stalls from month ${stag.startStep} to month ${lastMonth(stag)}. ` +
        `Layoffs add ${points(job.magnitude)} points to unemployment between months ${job.startStep} and ${lastMonth(job)}. ` +
        `An oil glut runs from month ${oil.startStep} to month ${lastMonth(oil)}.`,
    ],
    chapters: [
      {
        id: "prices",
        label: "Prices and borrowing costs",
        from: stag.startStep,
        to: lastMonth(stag),
        layer: "Consumers",
        paragraphs: [
          [
            `Consumer confidence and spending fall from month ${firstMove} and reach their low by month ${lowFrom}, ` +
              `where they stay through month ${lowTo}. Borrowing costs climb until month ${cost.at}.`,
          ],
          [
            `While the shocks last, ${pct(fromCost)} of new missed payments come from higher borrowing costs ` +
              `and ${pct(fromIncome)} from lost income.`,
          ],
        ],
      },
      {
        id: "layoffs",
        label: "Layoffs",
        from: job.startStep,
        to: uPeak.at,
        layer: "Consumers",
        node: UNEMPLOYMENT,
        paragraphs: [
          [
            `Layoffs add ${points(job.magnitude)} points to unemployment between months ${job.startStep} and ${lastMonth(job)}. ` +
              `Some people find work again over the same months, so unemployment peaks in month ${uPeak.at} ` +
              `at ${resultPoints(uPeak.value * POINTS_AT_TOP)} points above its starting level: `,
            tr(`about ${people(peopleOutOfWork(uPeak.value))} more people out of work`, "jobs"),
            ".",
          ],
        ],
        research: "sullivan",
      },
      {
        id: "oil",
        label: "Oil glut",
        from: oil.startStep,
        to: lastMonth(oil),
        layer: "Credit",
        paragraphs: [
          [
            `The oil glut lowers borrowing costs and eases strain in funding markets. Compared with the same run ` +
              `without it, bank stress peaks ${pctLower(banksNoOil.peak, banks.peak)} lower and missed payments ` +
              `peak ${pctLower(mPeakNoOil, mPeak.value)} lower.`,
          ],
        ],
      },
      {
        id: "missed",
        label: "Missed payments",
        from: shocksEnd,
        to: mPeak.at,
        layer: "Consumers",
        node: MISSED,
        paragraphs: [
          [
            `The shocks end after month ${shocksEnd}. Missed payments are then at ${pct(missed[shocksEnd] / mPeak.value)} ` +
              `of their eventual peak, and they keep rising until month ${mPeak.at}. At the peak, `,
            tr(
              `${countRange(foreclosuresAtPeak)} more people a quarter get a new foreclosure on their credit report than before the shocks`,
              "foreclosures"
            ),
            ".",
          ],
        ],
      },
      {
        id: "banks",
        label: "Banks",
        from: lossesStart,
        to: lossesPeak.at,
        layer: "Credit",
        node: LOSSES,
        paragraphs: [
          [
            `Loan losses begin in month ${lossesStart} and rise until month ${lossesPeak.at}. Bank stress peaks in ` +
              `month ${banks.peakAt}` +
              (standards.at === banks.peakAt
                ? ", the same month lending is tightest: "
                : `, and lending is tightest in month ${standards.at}: `),
            tr(
              `a net ${pctRange(tightening)} of banks are tightening standards on loans to small businesses`,
              "lending"
            ),
            `. The credit squeeze peaks in month ${squeezePeak.at}.`,
          ],
        ],
      },
      {
        id: "feedback",
        label: "Feedback",
        from: shocksEnd + 1,
        to: L,
        layer: "Credit",
        paragraphs: [
          [
            `Bank losses make investors pull back. Funding costs rise, banks tighten lending, and borrowers who cannot ` +
              `refinance miss payments. Without this feedback, missed payments would peak ` +
              `${pctLower(mPeak.value, Math.max(...noLoop))} lower and would be ${pctLower(missed[L], noLoop[L])} ` +
              `lower in month ${L}.`,
          ],
        ],
      },
      {
        id: "end",
        label: "Two years later",
        from: L,
        to: L,
        layer: null,
        paragraphs: [
          [
            `In month ${L}, unemployment is ${resultPoints(u[L] * POINTS_AT_TOP)} points above its starting level: `,
            tr(`about ${people(peopleOutOfWork(u[L]))} people`, "jobs"),
            `. Missed payments are at ${pct(endShare)} of their peak: `,
            tr(
              `${countRange(foreclosuresAtEnd)} more people a quarter get a new foreclosure than before the shocks`,
              "foreclosures"
            ),
            `. The credit squeeze is at ${pct(squeeze[L] / squeezePeak.value)} of its peak.`,
          ],
        ],
      },
      {
        id: "buffers",
        label: "With high buffers",
        from: 0,
        to: L,
        layer: null,
        compare: { run: high, label: "High buffers" },
        paragraphs: [
          [
            `With high buffers, missed payments peak ${pctLower(mPeak.value, Math.max(...missedHigh))} lower. ` +
              `In month ${L} they are ${pctLower(missed[L], missedHigh[L])} lower, and `,
            tr(`about ${people(fewerAtEnd)} fewer people are out of work`, "jobs"),
            ".",
          ],
        ],
      },
    ],
    checks: [
      ["the run lasts two years", L === 23],
      ["confidence and spending start falling in the first month", firstMove === 1],
      ["confidence and spending reach their low before it ends", lowFrom > firstMove && lowTo >= lowFrom],
      ["unemployment peaks below the size of the layoffs", uPeak.value * POINTS_AT_TOP < job.magnitude],
      ["the oil glut lowers both peaks", banks.peak < banksNoOil.peak && mPeak.value < mPeakNoOil],
      ["missed payments keep rising after the shocks end", mPeak.at > shocksEnd],
      ["loan losses begin before they peak", lossesStart > 0 && lossesStart < lossesPeak.at],
      ["feedback raises missed payments", Math.max(...noLoop) < mPeak.value && noLoop[L] < missed[L]],
      [
        "high buffers lower missed payments and unemployment",
        Math.max(...missedHigh) < mPeak.value && fewerAtEnd > 0,
      ],
    ],
  };
}

function unemploymentShock(runs: Runs): WrittenStory {
  const base = runs.base;
  const L = base.steps - 1;
  const job = eventOf(runs, "unemployment");
  const u = series(base, UNEMPLOYMENT);
  const uPeak = peakOf(u);
  const income = peakOf(series(base, "consumers_income"));
  const savingsStart = firstAt(series(base, "consumers_savings"), 0.005);
  const missed = series(base, MISSED);
  const mPeak = peakOf(missed);
  const lags = runs.lagRange();
  const foreclosuresAtPeak = foreclosuresAbove(lags.map((r) => peakOf(series(r, MISSED)).value));
  const lossesPeak = peakOf(series(base, LOSSES));
  const tightening = banksTightening(lags.map((r) => peakOf(series(r, STANDARDS)).value));
  const banks = layerOf(base, "Credit");
  const markets = layerOf(base, "Markets");
  const noLoopPeak = Math.max(...series(runs.withoutFeedback(), MISSED));
  const high = runs.with({ bufferPreset: "high" });
  const uHigh = series(high, UNEMPLOYMENT);
  const missedHigh = series(high, MISSED);
  const atEnd = peopleOutOfWork(u[L]);
  const size = points(job.magnitude);
  const unit = job.magnitude === 1 ? "point" : "points";

  return {
    kind: "written",
    headline: [
      `Two years after a ${size}-point rise in unemployment, `,
      tr(`about ${people(atEnd)} more people are still out of work`, "jobs"),
      ".",
    ],
    dek: [
      `Layoffs add ${size} ${unit} to unemployment between months ${job.startStep} and ${lastMonth(job)}. No other shock is applied.`,
    ],
    chapters: [
      {
        id: "layoffs",
        label: "Layoffs",
        from: job.startStep,
        to: uPeak.at,
        layer: "Consumers",
        node: UNEMPLOYMENT,
        paragraphs: [
          [
            `Layoffs add ${size} ${unit} to unemployment between months ${job.startStep} and ${lastMonth(job)}: `,
            tr(`about ${people(peopleOutOfWork(job.magnitude / POINTS_AT_TOP))} people`, "jobs"),
            `. Unemployment peaks in month ${uPeak.at} at ${resultPoints(uPeak.value * POINTS_AT_TOP)} points above its ` +
              `starting level, because some people find work again over the same months.`,
          ],
        ],
        research: "roelfs",
      },
      {
        id: "households",
        label: "Household finances",
        from: uPeak.at,
        to: mPeak.at,
        layer: "Consumers",
        node: MISSED,
        paragraphs: [
          [
            `The income squeeze peaks in month ${income.at}, and households begin drawing on savings ` +
              `${savingsStart === income.at ? "the same month" : `in month ${savingsStart}`}. Missed payments rise ` +
              `until month ${mPeak.at}, ${mPeak.at - lastMonth(job)} months after the layoffs end. At the peak, `,
            tr(
              `${countRange(foreclosuresAtPeak)} more people a quarter get a new foreclosure on their credit report than before`,
              "foreclosures"
            ),
            ".",
          ],
        ],
      },
      {
        id: "banks",
        label: "Banks and markets",
        from: mPeak.at,
        to: banks.peakAt,
        layer: "Credit",
        node: LOSSES,
        paragraphs: [
          [
            `Loan losses peak in month ${lossesPeak.at}. Lending standards barely change: `,
            tr(
              tightening[1] < 1
                ? "fewer than 1% of banks, on net, tighten them"
                : `a net ${pctRange(tightening)} of banks tighten them`,
              "lending"
            ),
            ". Bank and market stress stay near zero. Feedback from banks to households is too small to change the " +
              "peak in missed payments.",
          ],
        ],
      },
      {
        id: "end",
        label: "Two years later",
        from: L,
        to: L,
        layer: null,
        paragraphs: [
          [
            `In month ${L}, unemployment is ${resultPoints(u[L] * POINTS_AT_TOP)} points above its starting level: `,
            tr(`about ${people(atEnd)} people`, "jobs"),
            `. Missed payments are at ${pct(missed[L] / mPeak.value)} of their peak.`,
          ],
        ],
      },
      {
        id: "buffers",
        label: "With high buffers",
        from: 0,
        to: L,
        layer: null,
        compare: { run: high, label: "High buffers" },
        paragraphs: [
          [
            `With high buffers, unemployment peaks at ${resultPoints(Math.max(...uHigh) * POINTS_AT_TOP)} points instead of ` +
              `${resultPoints(uPeak.value * POINTS_AT_TOP)}. In month ${L}, `,
            tr(`about ${people(atEnd - peopleOutOfWork(uHigh[L]))} fewer people are out of work`, "jobs"),
            `, and missed payments are ${pctLower(missed[L], missedHigh[L])} lower.`,
          ],
        ],
      },
    ],
    checks: [
      ["the run lasts two years", L === 23],
      ["unemployment is the only shock", runs.scenario.events.length === 1],
      ["unemployment peaks below the size of the layoffs", uPeak.value * POINTS_AT_TOP < job.magnitude],
      ["missed payments peak after the layoffs end", mPeak.at > lastMonth(job)],
      ["savings start to fall once incomes are squeezed", savingsStart >= income.at - 1],
      ["bank and market stress stay near zero", banks.peak < 0.02 && markets.peak < 0.02],
      ["feedback barely changes the peak in missed payments", Math.abs(1 - noLoopPeak / mPeak.value) < 0.01],
      ["high buffers leave fewer people out of work", uHigh[L] < u[L] && missedHigh[L] < missed[L]],
    ],
  };
}

/** The presets with a written story, by preset id. */
export const WRITTEN_STORIES: Record<string, (runs: Runs) => WrittenStory> = {
  stagflation_oil: stagflationMeetsOilGlut,
  unemployment: unemploymentShock,
};
