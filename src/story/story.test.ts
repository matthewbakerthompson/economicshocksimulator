import { describe, expect, it } from "vitest";
import { simulateScenario } from "../sim/engine";
import { presetById } from "../sim/presets";
import type { CausalEvent, Scenario } from "../sim/types";
import { STORY_SETTINGS, isStoryRun, storyFor } from "./index";
import { LABOR_FORCE, banksTightening, foreclosuresAbove, peopleOutOfWork } from "./sources";
import { countRange, people, plainText, resultPoints } from "./text";
import type { StoryView, WrittenStory } from "./types";

const settings = { lagPreset: STORY_SETTINGS.lagPreset, bufferPreset: STORY_SETTINGS.bufferPreset } as const;
const scenarioOf = (events: CausalEvent[], patch: Partial<Scenario> = {}): Scenario => ({
  events,
  ...settings,
  ...patch,
});

function written(presetId: string): WrittenStory {
  const view = storyFor(presetId, scenarioOf(presetById(presetId)!.events), STORY_SETTINGS.steps);
  if (view.kind !== "written") throw new Error(`${presetId} has no written story`);
  return view;
}

const allText = (v: StoryView) =>
  v.kind === "written"
    ? [v.headline, v.dek, ...v.chapters.flatMap((c) => c.paragraphs)].map(plainText).join(" ")
    : [v.headline, ...v.paragraphs].map(plainText).join(" ");

const argmax = (s: number[]) => s.indexOf(Math.max(...s));

describe("written stories", () => {
  it("are shown for their presets' own runs, and every claim in words holds", () => {
    for (const id of ["stagflation_oil", "unemployment"]) {
      const story = written(id);
      expect(story.checks.filter(([, holds]) => !holds)).toEqual([]);
    }
  });

  it("keep the approved text for 'Stagflation meets an oil glut'", () => {
    const s = written("stagflation_oil");
    expect(plainText(s.headline)).toBe(
      "Two years after stagflation sets in, missed payments are still at 75% of their peak."
    );
    expect(s.chapters.map((c) => c.label)).toEqual([
      "Prices and borrowing costs",
      "Layoffs",
      "Oil glut",
      "Missed payments",
      "Banks",
      "Feedback",
      "Two years later",
      "With high buffers",
    ]);
    expect(s.chapters.map((c) => c.paragraphs.map(plainText).join(" "))).toEqual([
      "Consumer confidence and spending fall from month 1 and reach their low by month 7, where they stay through month 11. Borrowing costs climb until month 12. While the shocks last, 74% of new missed payments come from higher borrowing costs and 21% from lost income.",
      "Layoffs add 1.5 points to unemployment between months 2 and 7. Some people find work again over the same months, so unemployment peaks in month 8 at 1.35 points above its starting level: about 2.3 million more people out of work.",
      "The oil glut lowers borrowing costs and eases strain in funding markets. Compared with the same run without it, bank stress peaks 17% lower and missed payments peak 10% lower.",
      "The shocks end after month 9. Missed payments are then at 54% of their eventual peak, and they keep rising until month 14. At the peak, 90,000 to 130,000 more people a quarter get a new foreclosure on their credit report than before the shocks.",
      "Loan losses begin in month 6 and rise until month 17. Bank stress peaks in month 14, the same month lending is tightest: a net 17% to 20% of banks are tightening standards on loans to small businesses. The credit squeeze peaks in month 16.",
      "Bank losses make investors pull back. Funding costs rise, banks tighten lending, and borrowers who cannot refinance miss payments. Without this feedback, missed payments would peak 8% lower and would be 20% lower in month 23.",
      "In month 23, unemployment is 0.63 points above its starting level: about 1.1 million people. Missed payments are at 75% of their peak: 72,000 to 88,000 more people a quarter get a new foreclosure than before the shocks. The credit squeeze is at 93% of its peak.",
      "With high buffers, missed payments peak 8% lower. In month 23 they are 19% lower, and about 320,000 fewer people are out of work.",
    ]);
  });

  it("keep the approved text for 'Unemployment shock'", () => {
    const s = written("unemployment");
    expect(plainText(s.headline)).toBe(
      "Two years after a 1-point rise in unemployment, about 630,000 more people are still out of work."
    );
    expect(s.chapters.map((c) => c.label)).toEqual([
      "Layoffs",
      "Household finances",
      "Banks and markets",
      "Two years later",
      "With high buffers",
    ]);
    expect(s.chapters.map((c) => c.paragraphs.map(plainText).join(" "))).toEqual([
      "Layoffs add 1 point to unemployment between months 1 and 4: about 1.7 million people. Unemployment peaks in month 5 at 0.93 points above its starting level, because some people find work again over the same months.",
      "The income squeeze peaks in month 7, and households begin drawing on savings the same month. Missed payments rise until month 10, 6 months after the layoffs end. At the peak, 17,000 to 18,000 more people a quarter get a new foreclosure on their credit report than before.",
      "Loan losses peak in month 13. Lending standards barely change: fewer than 1% of banks, on net, tighten them. Bank and market stress stay near zero. Feedback from banks to households is too small to change the peak in missed payments.",
      "In month 23, unemployment is 0.37 points above its starting level: about 630,000 people. Missed payments are at 56% of their peak.",
      "With high buffers, unemployment peaks at 0.90 points instead of 0.93. In month 23, about 210,000 fewer people are out of work, and missed payments are 25% lower.",
    ]);
  });

  it("match the model's own numbers, worked out here separately", () => {
    const events = presetById("stagflation_oil")!.events;
    const r = simulateScenario(scenarioOf(events), 24);
    const high = simulateScenario(scenarioOf(events, { bufferPreset: "high" }), 24);
    const u = r.seriesByNode.consumers_unemployment;
    const missed = r.seriesByNode.consumers_delinquency;
    const text = allText(written("stagflation_oil"));

    expect(text).toContain(
      `unemployment peaks in month ${argmax(u)} at ${resultPoints(Math.max(...u) * 6)} points`
    );
    expect(text).toContain(
      `about ${people((Math.max(...u) * 6 * LABOR_FORCE) / 100)} more people out of work`
    );
    expect(text).toContain(`keep rising until month ${argmax(missed)}`);
    expect(text).toContain(`still at ${Math.round((missed[23] / Math.max(...missed)) * 100)}% of their peak`);
    expect(text).toContain(`rise until month ${argmax(r.seriesByNode.credit_bank_losses)}`);
    expect(text).toContain(`The credit squeeze peaks in month ${argmax(r.seriesByNode.credit_access)}`);
    expect(text).toContain(
      `In month 23 they are ${Math.round((1 - high.seriesByNode.consumers_delinquency[23] / missed[23]) * 100)}% lower`
    );
    const fewer = ((u[23] - high.seriesByNode.consumers_unemployment[23]) * 6 * LABOR_FORCE) / 100;
    expect(text).toContain(`about ${people(fewer)} fewer people are out of work`);

    const job = presetById("unemployment")!.events;
    const r2 = simulateScenario(scenarioOf(job), 24);
    const u2 = r2.seriesByNode.consumers_unemployment;
    const text2 = allText(written("unemployment"));
    expect(text2).toContain(
      `Unemployment peaks in month ${argmax(u2)} at ${resultPoints(Math.max(...u2) * 6)} points`
    );
    expect(text2).toContain(
      `about ${people((u2[23] * 6 * LABOR_FORCE) / 100)} more people are still out of work`
    );
    expect(text2).toContain(
      `Missed payments rise until month ${argmax(r2.seriesByNode.consumers_delinquency)}`
    );
  });

  it("set translations into people apart from the model's results", () => {
    const s = written("stagflation_oil");
    const translated = s.chapters
      .flatMap((c) => c.paragraphs.flat())
      .filter((seg) => typeof seg !== "string");
    expect(translated.map((seg) => seg.source)).toEqual([
      "jobs",
      "foreclosures",
      "lending",
      "jobs",
      "foreclosures",
      "jobs",
    ]);
    // Every count of people is a translation, never plain model text.
    for (const c of s.chapters)
      for (const p of c.paragraphs)
        for (const seg of p)
          if (typeof seg === "string") expect(seg).not.toMatch(/million|\d,\d{3}|\d people/);
  });

  it("never show a 0-to-1 stress value", () => {
    for (const id of ["stagflation_oil", "unemployment"]) {
      // Decimals appear only in points of unemployment and millions of people.
      const rest = allText(written(id))
        .replace(/\d+\.\d+ (points?|million)\b/g, "")
        .replace(/instead of \d+\.\d+/g, "");
      expect(rest).not.toMatch(/\d\.\d/);
    }
  });
});

describe("summaries", () => {
  it("replace the written story when a setting changes", () => {
    const events = presetById("stagflation_oil")!.events;
    expect(isStoryRun("stagflation_oil", scenarioOf(events), 24)).toBe(true);
    for (const [patch, steps] of [
      [{ bufferPreset: "high" }, 24],
      [{ lagPreset: "long" }, 24],
      [{}, 18],
    ] as const) {
      const view = storyFor("stagflation_oil", scenarioOf(events, patch), steps);
      expect(view).toMatchObject({ kind: "summary", reason: "settings" });
    }
    const edited = events.map((e) => (e.type === "oil_glut" ? { ...e, magnitude: 0.5 } : e));
    expect(isStoryRun("stagflation_oil", scenarioOf(edited), 24)).toBe(false);
  });

  it("state the facts of a run with no written story", () => {
    const view = storyFor("stagflation", scenarioOf(presetById("stagflation")!.events), 24);
    expect(view).toMatchObject({ kind: "summary", reason: "no-story" });
    expect(plainText(view.headline)).toBe("Missed payments peak in month 16.");
    const text = allText(view);
    expect(text).toContain("This run applies stagflation at severity 0.65 in months 0 to 9.");
    expect(text).toContain(
      "Unemployment does not change. In this model, only an unemployment shock moves it."
    );
    expect(text).toContain(
      "Household stress peaks in month 10, bank stress in month 14 and market stress in month 12."
    );
  });

  it("say so when nothing happens, or when the shocks outlast the run", () => {
    expect(plainText(storyFor("blank", scenarioOf([]), 24).headline)).toBe("This scenario has no shocks.");
    const oil = storyFor(
      "custom",
      scenarioOf([{ id: "o", type: "oil_glut", magnitude: 0.8, startStep: 1, durationSteps: 6 }]),
      24
    );
    expect(plainText(oil.headline)).toBe("These shocks barely move the economy.");
    expect(allText(oil)).toContain(
      "An oil glut removes stress, and this scenario has none for it to remove."
    );
    const long = storyFor(
      "custom",
      scenarioOf([{ id: "s", type: "stagflation", magnitude: 0.6, startStep: 0, durationSteps: 12 }]),
      12
    );
    expect(allText(long)).toContain("The shocks are still running in month 11.");
  });
});

describe("translations", () => {
  it("turn unemployment into people with the BLS labor force", () => {
    expect(peopleOutOfWork(1 / 6)).toBeCloseTo(1_702_620);
    expect(people(peopleOutOfWork(1 / 6))).toBe("1.7 million");
  });

  it("scale missed payments and lending by the 2008–10 peaks, as ranges", () => {
    expect(foreclosuresAbove([0.1, 0.2])).toEqual([0.1 * (566_180 - 178_860), 0.2 * (566_180 - 148_780)]);
    expect(banksTightening([0.2, 0.25])).toEqual([0.2 * 69.2, 0.25 * 74.5]);
  });

  it("round counts the way a newspaper would", () => {
    expect(people(2_298_000)).toBe("2.3 million");
    expect(people(623_600)).toBe("620,000");
    expect(people(17_450)).toBe("17,000");
    expect(countRange([91_900, 126_000])).toBe("90,000 to 130,000");
    expect(countRange([72_100, 88_200])).toBe("72,000 to 88,000");
    expect(countRange([17_020, 17_400])).toBe("about 17,000");
  });
});
