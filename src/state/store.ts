import { create } from "zustand";
import type { NodeId, SimulationResult } from "../sim/types";
import { defaultScenario, type Scenario } from "../sim/types";
import { simulateInWorker } from "../sim/workerClient";

type AppState = {
  scenario: Scenario;
  steps: number;
  isSimulating: boolean;
  isPlaying: boolean;
  playIntervalMs: number;
  t: number;
  tFloat: number;
  selectedNodeId: NodeId | null;
  hoverNodeId: NodeId | null;
  result: SimulationResult | null;

  setScenario: (patch: Partial<Scenario>) => void;
  setSteps: (steps: number) => void;
  setT: (t: number | ((prev: number) => number)) => void;
  setPlayhead: (tFloat: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlayIntervalMs: (ms: number) => void;
  setSelectedNodeId: (id: NodeId | null) => void;
  setHoverNodeId: (id: NodeId | null) => void;

  runSimulation: () => Promise<void>;
  reset: () => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  scenario: defaultScenario(),
  steps: 10,
  isSimulating: false,
  isPlaying: false,
  playIntervalMs: 1100,
  t: 0,
  tFloat: 0,
  selectedNodeId: "consumers_unemployment",
  hoverNodeId: null,
  result: null,

  setScenario: (patch) => set({ scenario: { ...get().scenario, ...patch } }),
  setSteps: (steps) => set({ steps }),
  setT: (t) => {
    if (typeof t === "function") {
      set((s) => {
        const nextT = t(s.t);
        return { t: nextT, tFloat: nextT };
      });
    } else {
      set({ t, tFloat: t });
    }
  },
  setPlayhead: (tFloat) => {
    const r = get().result;
    const maxT = Math.max(0, (r?.steps ?? get().steps) - 1);
    const clamped = Math.max(0, Math.min(maxT, tFloat));
    const t = Math.floor(clamped + 1e-6);
    set({ tFloat: clamped, t });
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlayIntervalMs: (ms) => set({ playIntervalMs: ms }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHoverNodeId: (id) => set({ hoverNodeId: id }),

  runSimulation: async () => {
    const { scenario, steps } = get();
    set({ isSimulating: true, isPlaying: false });
    try {
      const result = await simulateInWorker({ scenario, steps });
      set({ result, t: 0, tFloat: 0 });
    } finally {
      set({ isSimulating: false });
    }
  },

  reset: () =>
    set({
      scenario: defaultScenario(),
      steps: 10,
      isSimulating: false,
      isPlaying: false,
      playIntervalMs: 1100,
      t: 0,
      tFloat: 0,
      selectedNodeId: "consumers_unemployment",
      hoverNodeId: null,
      result: null,
    }),
}));


