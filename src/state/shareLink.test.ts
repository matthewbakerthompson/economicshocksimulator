import { describe, expect, it } from "vitest";
import { presetById } from "../sim/presets";
import { type ShareState, decodeShareHash, encodeShareHash } from "./shareLink";

const fallback: ShareState = {
  scenario: { events: presetById("stagflation_oil")!.events, lagPreset: "medium", bufferPreset: "medium" },
  steps: 24,
  t: 0,
  selectedNodeId: "consumers_delinquency",
};

const custom: ShareState = {
  scenario: {
    events: [
      { id: "a", type: "unemployment", magnitude: 2.5, startStep: 1, durationSteps: 6 },
      { id: "b", type: "oil_glut", magnitude: 0.45, startStep: 8, durationSteps: 1 },
    ],
    lagPreset: "long",
    bufferPreset: "low",
  },
  steps: 18,
  t: 9,
  selectedNodeId: "markets_liquidity",
};

describe("share links", () => {
  it("writes a readable hash", () => {
    expect(encodeShareHash(custom)).toBe(
      "#events=u2.5@1-6,o0.45@8-8&lags=long&buffers=low&horizon=18&month=9&node=markets_liquidity"
    );
  });

  it("round-trips a custom scenario", () => {
    const link = decodeShareHash(encodeShareHash(custom), fallback)!;
    expect(link.presetId).toBe("custom");
    expect(link.hasMonth).toBe(true);
    expect(link.steps).toBe(18);
    expect(link.t).toBe(9);
    expect(link.selectedNodeId).toBe("markets_liquidity");
    expect(link.scenario.lagPreset).toBe("long");
    expect(link.scenario.bufferPreset).toBe("low");
    // Ids aren't in the link; everything else is.
    expect(link.scenario.events).toEqual(custom.scenario.events.map((e, i) => ({ ...e, id: `link_${i}` })));
  });

  it("recognises a preset", () => {
    const link = decodeShareHash(encodeShareHash({ ...fallback, t: 12 }), fallback)!;
    expect(link.presetId).toBe("stagflation_oil");
    expect(link.scenario.events).toBe(fallback.scenario.events);
  });

  it("ignores a hash with no scenario in it", () => {
    expect(decodeShareHash("", fallback)).toBeNull();
    expect(decodeShareHash("#top", fallback)).toBeNull();
  });

  it("falls back to the defaults for anything invalid, without throwing", () => {
    const link = decodeShareHash(
      "#events=u2@3-1,x9@0-4&lags=fast&buffers=&horizon=36&month=-2&node=consumers_nope",
      fallback
    )!;
    expect(link.scenario).toEqual(fallback.scenario);
    expect(link.steps).toBe(24);
    expect(link.t).toBe(0);
    expect(link.hasMonth).toBe(false);
    expect(link.selectedNodeId).toBe("consumers_delinquency");
    expect(() => decodeShareHash("#events=%E0%A4%A&horizon=%%%", fallback)).not.toThrow();
  });

  it("keeps an empty event stack, and clips events to the horizon", () => {
    expect(decodeShareHash("#events=&horizon=12", fallback)!.scenario.events).toEqual([]);
    const [ev] = decodeShareHash("#events=u9@10-30&horizon=12&month=40", fallback)!.scenario.events;
    expect(ev).toMatchObject({ magnitude: 6, startStep: 10, durationSteps: 2 });
    expect(decodeShareHash("#events=u1@10-30&horizon=12&month=40", fallback)!.t).toBe(11);
  });
});
