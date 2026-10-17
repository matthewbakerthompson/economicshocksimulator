import { describe, expect, it } from "vitest";
import { simulateScenario } from "./engine";
import { presetById } from "./presets";
import { describeMonth, fmtDelta } from "./story";
import type { CausalEvent, Scenario } from "./types";

function scenario(events: CausalEvent[]): Scenario {
  return { events, lagPreset: "medium", bufferPreset: "medium" };
}

const stacked = scenario(presetById("stagflation_oil")!.events);

describe("describeMonth", () => {
  it("starts at rest", () => {
    const r = simulateScenario(stacked, 24);
    expect(describeMonth(r, stacked, 0).headline).toBe("The system starts at rest");
  });

  it("headlines the biggest move and lists what is active", () => {
    const r = simulateScenario(stacked, 24);
    const story = describeMonth(r, stacked, 4);
    const S = r.seriesByNode[story.topMover!.nodeId];
    for (const id of r.nodeIds) {
      expect(Math.abs(r.seriesByNode[id][4] - r.seriesByNode[id][3])).toBeLessThanOrEqual(S[4] - S[3]);
    }
    expect(story.detail).toBe(
      "Active: stagflation (severity 0.65), an oil glut (severity 0.70) and unemployment +1.5pp. " +
        "Stagflation mutes the oil glut's relief."
    );
  });

  it("says which events ended once the stress is moving on its own", () => {
    const r = simulateScenario(stacked, 24);
    const story = describeMonth(r, stacked, 12);
    expect(story.headline).toBe("Bank losses rise fastest, +0.058");
    expect(story.activeEvents).toEqual([]);
    expect(story.detail).toBe(
      "The oil glut, unemployment and stagflation ended by month 9. Stress is still moving on its own, through the lags."
    );
  });

  it("points to the first event before anything has happened", () => {
    const s = scenario([{ id: "u", type: "unemployment", magnitude: 1, startStep: 5, durationSteps: 2 }]);
    const story = describeMonth(simulateScenario(s, 12), s, 2);
    expect(story.headline).toBe("Little moves this month");
    expect(story.detail).toBe("Nothing has happened yet. Unemployment +1.0pp starts in month 5.");
  });

  it("invites an event when the scenario has none", () => {
    const s = scenario([]);
    expect(describeMonth(simulateScenario(s, 12), s, 3).detail).toMatch(/^No events in this scenario/);
  });
});

describe("fmtDelta", () => {
  it("signs every change and uses a true minus", () => {
    expect(fmtDelta(0.0584)).toBe("+0.058");
    expect(fmtDelta(-0.046)).toBe("−0.046");
    expect(fmtDelta(-0.00001)).toBe("+0.000");
  });
});
