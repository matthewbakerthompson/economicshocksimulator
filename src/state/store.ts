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
  selectedNodeId: NodeId | null;
  hoverNodeId: NodeId | null;
  result: SimulationResult | null;

  setScenario: (patch: Partial<Scenario>) => void;
  setSteps: (steps: number) => void;
  setT: (t: number | ((prev: number) => number)) => void;
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
  selectedNodeId: "consumers_unemployment",
  hoverNodeId: null,
  result: null,

  setScenario: (patch) => set({ scenario: { ...get().scenario, ...patch } }),
  setSteps: (steps) => set({ steps }),
  setT: (t) => {
    if (typeof t === "function") set((s) => ({ t: t(s.t) }));
    else set({ t });
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
      set({ result, t: 0 });
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
      selectedNodeId: "consumers_unemployment",
      hoverNodeId: null,
      result: null,
    }),
}));


