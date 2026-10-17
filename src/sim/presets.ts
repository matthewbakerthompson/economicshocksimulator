import type { CausalEvent } from "./types";

export type Preset = {
  id: string;
  label: string;
  events: CausalEvent[];
};

export const PRESETS: Preset[] = [
  {
    id: "stagflation_oil",
    label: "Stagflation meets an oil glut",
    events: [
      { id: "preset_stagflation", type: "stagflation", magnitude: 0.65, startStep: 0, durationSteps: 10 },
      { id: "preset_oil_glut", type: "oil_glut", magnitude: 0.7, startStep: 3, durationSteps: 5 },
      { id: "preset_unemployment", type: "unemployment", magnitude: 1.5, startStep: 2, durationSteps: 6 },
    ],
  },
  {
    id: "unemployment",
    label: "Unemployment shock",
    events: [{ id: "preset_unemployment", type: "unemployment", magnitude: 1.0, startStep: 1, durationSteps: 4 }],
  },
  {
    // The first preset without its oil glut and job losses, for comparison.
    id: "stagflation",
    label: "Stagflation alone",
    events: [{ id: "preset_stagflation", type: "stagflation", magnitude: 0.65, startStep: 0, durationSteps: 10 }],
  },
  { id: "blank", label: "Blank: no events", events: [] },
];

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
