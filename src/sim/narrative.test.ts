import { describe, expect, it } from "vitest";
import { simulateScenario } from "./engine";
import { buildNarrative } from "./narrative";
import { PRESETS, presetById } from "./presets";
import type { CausalEvent, Scenario } from "./types";

function scenario(events: CausalEvent[]): Scenario {
  return { events, lagPreset: "medium", bufferPreset: "medium" };
}

function story(events: CausalEvent[], steps = 24) {
  const s = scenario(events);
  return buildNarrative(simulateScenario(s, steps), s);
}

describe("buildNarrative", () => {
  it("states the finding as the title, from the run's own numbers", () => {
    const n = story(presetById("stagflation_oil")!.events);
    expect(n.title).toBe(
      "Three overlapping shocks reach the banks within 5 months, and 14 months after they end, bank stress is still 86% of its peak"
    );
  });

  it("tells the run in time order: the shock, each layer's peak, then the aftermath", () => {
    const n = story(presetById("stagflation_oil")!.events);
    expect(n.chapters.map((c) => c.title)).toEqual([
      "The shocks land",
      "Markets peak in month 10",
      "Households peak in month 11",
      "The banks peak in month 16",
      "The aftermath",
    ]);
    const banks = n.chapters.find((c) => c.id === "Credit")!;
    expect(banks.body).toContain("Bank stress reaches 0.34, 5 months after households.");
  });

  it("covers every month from the first shock to the end, without gaps or rewinds", () => {
    for (const p of PRESETS.filter((p) => p.events.length > 0)) {
      const n = story(p.events);
      const first = Math.min(...p.events.map((e) => e.startStep));
      expect(n.chapters[0].from).toBe(first);
      expect(n.chapters[n.chapters.length - 1].to).toBe(23);
      n.chapters.forEach((c, i) => {
        expect(c.to).toBeGreaterThanOrEqual(c.from);
        if (i > 0) expect(c.from).toBe(n.chapters[i - 1].to + 1);
      });
    }
  });

  it("says so when a shock barely reaches the banks or markets", () => {
    const n = story(presetById("unemployment")!.events);
    expect(n.title).toBe(
      "A 1-point jump in unemployment hits households hard but barely reaches the banks: bank stress peaks at 0.04 in month 20"
    );
    expect(n.chapters.at(-1)!.body).toContain("Markets barely notice: market stress never gets past 0.02.");
    // Channels, not the shock itself, explain how stress travels.
    expect(n.chapters.find((c) => c.id === "Consumers")!.body).toMatch(
      /^Job losses cut incomes, with a one-month lag\./
    );
  });

  it("explains a scenario with nothing to tell", () => {
    expect(story([]).title).toBe("Add a shock to see how it spreads");
    const relief = story([{ id: "o", type: "oil_glut", magnitude: 0.8, startStep: 1, durationSteps: 6 }]);
    expect(relief.title).toMatch(/^An oil glut on its own changes nothing/);
    expect(relief.chapters).toHaveLength(1);
  });

  it("names stories that run to the horizon as still unfolding", () => {
    const n = story([{ id: "s", type: "stagflation", magnitude: 0.6, startStep: 0, durationSteps: 12 }], 12);
    const end = n.chapters.at(-1)!;
    expect(end.body).toContain("The shocks are still running in month 11.");
    expect(end.to).toBe(11);
  });
});
