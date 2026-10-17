import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./store";

const st = () => useAppStore.getState();

describe("playback", () => {
  beforeEach(() => {
    st().pause();
    st().setT(0);
  });

  it("plays a chapter from its first month and stops at its last", () => {
    st().play({ from: 12, to: 16 });
    expect(st()).toMatchObject({ t: 12, tFloat: 12, playUntil: 16, isPlaying: true });
    st().pause();
    expect(st()).toMatchObject({ isPlaying: false, playUntil: null });
  });

  it("restarts from month 0 when asked to play at the end", () => {
    st().setT(23);
    st().play();
    expect(st()).toMatchObject({ t: 0, isPlaying: true, playUntil: null });
  });

  it("pauses when you jump to a month, and keeps the month in range", () => {
    st().play();
    st().setT(40);
    expect(st()).toMatchObject({ t: 23, isPlaying: false });
    st().setT(-3);
    expect(st().t).toBe(0);
  });

  it("starts a new preset's story from the top", () => {
    st().setT(9);
    st().applyPreset("unemployment");
    expect(st()).toMatchObject({ presetId: "unemployment", t: 0, isPlaying: false });
  });
});
