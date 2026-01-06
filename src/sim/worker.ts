import type { Scenario, SimulationResult } from "./types";
import { simulateScenario } from "./engine";

type SimulateRequest = {
  type: "simulate";
  id: string;
  scenario: Scenario;
  steps: number;
};

type SimulateResponse =
  | { type: "simulate_result"; id: string; result: SimulationResult }
  | { type: "simulate_error"; id: string; error: string };

self.onmessage = (ev: MessageEvent<SimulateRequest>) => {
  const msg = ev.data;
  if (!msg || msg.type !== "simulate") return;

  try {
    const result = simulateScenario(msg.scenario, msg.steps);
    const res: SimulateResponse = { type: "simulate_result", id: msg.id, result };
    self.postMessage(res);
  } catch (err) {
    const res: SimulateResponse = {
      type: "simulate_error",
      id: msg.id,
      error: err instanceof Error ? err.message : "Unknown error",
    };
    self.postMessage(res);
  }
};



