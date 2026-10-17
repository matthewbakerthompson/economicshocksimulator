import { create } from "zustand";
import { PRESETS, presetById } from "../sim/presets";
import type { NodeId, Scenario, SimulationResult } from "../sim/types";
import { simulateInWorker } from "../sim/workerClient";
import { type DecodedLink, type Mode, type ShareState, decodeShareHash } from "./shareLink";

export const HORIZONS = [12, 18, 24] as const;
export const SPEEDS = [
  { label: "Slow", ms: 1400 },
  { label: "Normal", ms: 900 },
  { label: "Fast", ms: 450 },
] as const;

export type ExploreView = "layers" | "map" | "table";

type AppState = {
  mode: Mode;
  scenario: Scenario;
  /** The preset the scenario's events came from, or "custom" once they're edited. */
  presetId: string;
  steps: number;
  result: SimulationResult | null;
  error: string | null;
  isPlaying: boolean;
  /** Playback stops at this month (the end of a story chapter), or at the last month when null. */
  playUntil: number | null;
  playIntervalMs: number;
  t: number;
  tFloat: number;
  selectedNodeId: NodeId;
  hoverNodeId: NodeId | null;
  exploreView: ExploreView;

  setMode: (mode: Mode) => void;
  setScenario: (patch: Partial<Scenario>) => void;
  applyPreset: (id: string) => void;
  setSteps: (steps: number) => void;
  /** Jump to a month and pause. */
  setT: (t: number) => void;
  setPlayhead: (tFloat: number) => void;
  /** Play from `from` (or the current month) until `to` (or the end). */
  play: (range?: { from: number; to: number }) => void;
  pause: () => void;
  setPlayIntervalMs: (ms: number) => void;
  setSelectedNodeId: (id: NodeId) => void;
  setHoverNodeId: (id: NodeId | null) => void;
  setExploreView: (view: ExploreView) => void;
  applyLink: (link: DecodedLink) => void;
  runSimulation: () => Promise<void>;
};

const initialPreset = PRESETS[0];

export const DEFAULT_SHARE_STATE: ShareState = {
  mode: "story",
  scenario: { events: initialPreset.events, lagPreset: "medium", bufferPreset: "medium" },
  steps: 24,
  t: 0,
  selectedNodeId: "consumers_delinquency",
};

function readLink(): DecodedLink | null {
  if (typeof window === "undefined") return null;
  try {
    return decodeShareHash(window.location.hash, DEFAULT_SHARE_STATE);
  } catch {
    return null;
  }
}

/** The scenario the page was opened with, if its URL carried one. */
export const initialLink = readLink();
const start: DecodedLink = initialLink ?? { ...DEFAULT_SHARE_STATE, presetId: initialPreset.id, hasMonth: false };

let runToken = 0;
let runTimer: ReturnType<typeof setTimeout> | undefined;

export const useAppStore = create<AppState>((set, get) => {
  // Simulation is cheap, so every edit re-runs it; a short delay coalesces slider drags.
  const queueRun = () => {
    clearTimeout(runTimer);
    runTimer = setTimeout(() => void get().runSimulation(), 40);
  };

  const maxT = () => Math.max(0, (get().result?.steps ?? get().steps) - 1);
  const clampT = (t: number) => Math.max(0, Math.min(maxT(), t));

  return {
    mode: start.mode,
    scenario: start.scenario,
    presetId: start.presetId,
    steps: start.steps,
    result: null,
    error: null,
    isPlaying: false,
    playUntil: null,
    playIntervalMs: SPEEDS[1].ms,
    t: start.t,
    tFloat: start.t,
    selectedNodeId: start.selectedNodeId,
    hoverNodeId: null,
    exploreView: "layers",

    setMode: (mode) => set({ mode, isPlaying: false, playUntil: null }),
    setScenario: (patch) => {
      set({ scenario: { ...get().scenario, ...patch }, ...(patch.events ? { presetId: "custom" } : {}) });
      queueRun();
    },
    applyPreset: (id) => {
      const preset = presetById(id);
      if (!preset) return;
      // A new scenario is a new story: start it from the top.
      set({ scenario: { ...get().scenario, events: preset.events }, presetId: id, t: 0, tFloat: 0, isPlaying: false });
      queueRun();
    },
    setSteps: (steps) => {
      set({ steps });
      queueRun();
    },
    setT: (t) => {
      const c = clampT(Math.round(t));
      set({ t: c, tFloat: c, isPlaying: false, playUntil: null });
    },
    setPlayhead: (tFloat) => {
      const c = clampT(tFloat);
      set({ tFloat: c, t: Math.floor(c + 1e-6) });
    },
    play: (range) => {
      if (range) {
        const from = clampT(range.from);
        set({ t: from, tFloat: from, playUntil: clampT(range.to), isPlaying: true });
        return;
      }
      // Playing from the last month starts again from the top.
      if (get().t >= maxT()) set({ t: 0, tFloat: 0 });
      set({ playUntil: null, isPlaying: true });
    },
    pause: () => set({ isPlaying: false, playUntil: null }),
    setPlayIntervalMs: (ms) => set({ playIntervalMs: ms }),
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    setHoverNodeId: (id) => set({ hoverNodeId: id }),
    setExploreView: (view) => set({ exploreView: view }),
    applyLink: (link) => {
      set({
        mode: link.mode,
        scenario: link.scenario,
        presetId: link.presetId,
        steps: link.steps,
        selectedNodeId: link.selectedNodeId,
        t: link.t,
        tFloat: link.t,
        isPlaying: false,
        playUntil: null,
      });
      queueRun();
    },

    runSimulation: async () => {
      const token = ++runToken;
      const { scenario, steps } = get();
      try {
        const result = await simulateInWorker({ scenario, steps });
        if (token !== runToken) return; // A newer edit is already being simulated.
        const last = result.steps - 1;
        set({ result, error: null, t: Math.min(get().t, last), tFloat: Math.min(get().tFloat, last) });
      } catch (err) {
        if (token !== runToken) return;
        set({ error: err instanceof Error ? err.message : "The simulation failed.", isPlaying: false });
      }
    },
  };
});
