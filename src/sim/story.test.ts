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
    expect(describeMonth(r, stacked, 0).headline).toBe("Nothing has moved yet");
  });

  it("headlines the biggest move and lists what is active", () => {
    const r = simulateScenario(stacked, 24);
    const story = describeMonth(r, stacked, 4);
    const S = r.seriesByNode[story.topMover!.nodeId];
    for (const id of r.nodeIds) {
      expect(Math.abs(r.seriesByNode[id][4] - r.seriesByNode[id][3])).toBeLessThanOrEqual(S[4] - S[3]);
    }
    expect(story.detail).toBe(
      "Active: stagflation at severity 0.65, an oil glut at severity 0.70 and unemployment up 1.5 points. " +
        "During stagflation the oil glut's relief is 55% of its usual size."
    );
  });

  it("says which events ended once the stress is moving on its own", () => {
    const r = simulateScenario(stacked, 24);
    const story = describeMonth(r, stacked, 12);
    expect(story.headline).toBe("Risk aversion falls most, −0.046");
    expect(story.activeEvents).toEqual([]);
    expect(story.detail).toBe(
      "The oil glut, unemployment and stagflation ended by month 9. Stress is still passing from part to part."
    );
  });

  it("points to the first event before anything has happened", () => {
    const s = scenario([{ id: "u", type: "unemployment", magnitude: 1, startStep: 5, durationSteps: 2 }]);
    const story = describeMonth(simulateScenario(s, 12), s, 2);
    expect(story.headline).toBe("No part moves by 0.001 or more");
    expect(story.detail).toBe("No shock has started yet. Unemployment up 1 point starts in month 5.");
  });

  it("invites an event when the scenario has none", () => {
    const s = scenario([]);
    expect(describeMonth(simulateScenario(s, 12), s, 3).detail).toBe("This scenario has no shocks.");
  });
});

describe("fmtDelta", () => {
  it("signs every change and uses a true minus", () => {
    expect(fmtDelta(0.0584)).toBe("+0.058");
    expect(fmtDelta(-0.046)).toBe("−0.046");
    expect(fmtDelta(-0.00001)).toBe("+0.000");
  });
});
