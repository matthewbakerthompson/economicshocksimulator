import type { Scenario, SimulationResult } from "./types";

type SimulateRequest = {
  type: "simulate";
  id: string;
  scenario: Scenario;
  steps: number;
};

type SimulateResponse =
  | { type: "simulate_result"; id: string; result: SimulationResult }
  | { type: "simulate_error"; id: string; error: string };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<string, { resolve: (r: SimulationResult) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (ev: MessageEvent<SimulateResponse>) => {
    const msg = ev.data;
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    if (msg.type === "simulate_result") entry.resolve(msg.result);
    else entry.reject(new Error(msg.error));
  };
  return worker;
}

export async function simulateInWorker(args: { scenario: Scenario; steps: number }): Promise<SimulationResult> {
  const id = `sim_${Date.now()}_${seq++}`;
  const w = getWorker();
  const req: SimulateRequest = { type: "simulate", id, scenario: args.scenario, steps: args.steps };

  const p = new Promise<SimulationResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });

  w.postMessage(req);
  return await p;
}



