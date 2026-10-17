import { create } from "zustand";
import { PRESETS, presetById } from "../sim/presets";
import type { NodeId, Scenario, SimulationResult } from "../sim/types";
import { simulateInWorker } from "../sim/workerClient";
import { type DecodedLink, type ShareState, decodeShareHash } from "./shareLink";

export const HORIZONS = [12, 18, 24] as const;
export const SPEEDS = [
  { label: "0.5×", ms: 1600 },
  { label: "1×", ms: 900 },
  { label: "2×", ms: 450 },
] as const;

export type StageView = "network" | "table" | "story";

type AppState = {
  scenario: Scenario;
  /** The preset the scenario's events came from, or "custom" once they're edited. */
  presetId: string;
  steps: number;
  result: SimulationResult | null;
  isPlaying: boolean;
  playIntervalMs: number;
  t: number;
  tFloat: number;
  selectedNodeId: NodeId;
  hoverNodeId: NodeId | null;
  stageView: StageView;

  setScenario: (patch: Partial<Scenario>) => void;
  applyPreset: (id: string) => void;
  setSteps: (steps: number) => void;
  setT: (t: number) => void;
  setPlayhead: (tFloat: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlayIntervalMs: (ms: number) => void;
  setSelectedNodeId: (id: NodeId) => void;
  setHoverNodeId: (id: NodeId | null) => void;
  setStageView: (view: StageView) => void;
  applyLink: (link: DecodedLink) => void;
  runSimulation: () => Promise<void>;
};

const initialPreset = PRESETS[0];

export const DEFAULT_SHARE_STATE: ShareState = {
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

  return {
    scenario: start.scenario,
    presetId: start.presetId,
    steps: start.steps,
    result: null,
    isPlaying: false,
    playIntervalMs: SPEEDS[1].ms,
    t: start.t,
    tFloat: start.t,
    selectedNodeId: start.selectedNodeId,
    hoverNodeId: null,
    stageView: "network",

    setScenario: (patch) => {
      set({ scenario: { ...get().scenario, ...patch }, ...(patch.events ? { presetId: "custom" } : {}) });
      queueRun();
    },
    applyPreset: (id) => {
      const preset = presetById(id);
      if (!preset) return;
      set({ scenario: { ...get().scenario, events: preset.events }, presetId: id });
      queueRun();
    },
    setSteps: (steps) => {
      set({ steps });
      queueRun();
    },
    // Jumping to a month by hand pauses playback.
    setT: (t) => {
      const c = Math.max(0, Math.min(maxT(), Math.round(t)));
      set({ t: c, tFloat: c, isPlaying: false });
    },
    setPlayhead: (tFloat) => {
      const c = Math.max(0, Math.min(maxT(), tFloat));
      set({ tFloat: c, t: Math.floor(c + 1e-6) });
    },
    setIsPlaying: (isPlaying) => {
      // Playing from the last month starts again from the top.
      if (isPlaying && get().t >= maxT()) set({ t: 0, tFloat: 0 });
      set({ isPlaying });
    },
    setPlayIntervalMs: (ms) => set({ playIntervalMs: ms }),
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    setHoverNodeId: (id) => set({ hoverNodeId: id }),
    setStageView: (view) => set({ stageView: view }),
    applyLink: (link) => {
      set({
        scenario: link.scenario,
        presetId: link.presetId,
        steps: link.steps,
        selectedNodeId: link.selectedNodeId,
        t: link.t,
        tFloat: link.t,
        isPlaying: false,
      });
      queueRun();
    },

    runSimulation: async () => {
      const token = ++runToken;
      const { scenario, steps } = get();
      const result = await simulateInWorker({ scenario, steps });
      if (token !== runToken) return; // A newer edit is already being simulated.
      const last = result.steps - 1;
      const t = Math.min(get().t, last);
      set({ result, t, tFloat: Math.min(get().tFloat, last) });
    },
  };
});
