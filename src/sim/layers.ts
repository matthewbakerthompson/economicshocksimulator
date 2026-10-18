import { NODES } from "./graphSpec";
import type { LayerId, SimulationResult } from "./types";

/** Each layer's stress over a run: the mean of its parts, month by month. */
export type LayerSummary = {
  layer: LayerId;
  name: string;
  series: number[];
  peak: number;
  peakAt: number;
  /** Stress in the last month. */
  last: number;
  /** Whether the layer moves enough to talk about. */
  material: boolean;
};

export const LAYER_ORDER: LayerId[] = ["Consumers", "Credit", "Markets"];

export const LAYER_NAMES: Record<LayerId, string> = {
  Consumers: "Households",
  Credit: "Banks and credit",
  Markets: "Markets",
};

// Below this a layer's stress is too small to talk about.
export const MATERIAL = 0.03;

export function summarizeLayers(result: SimulationResult): LayerSummary[] {
  return LAYER_ORDER.map((layer) => {
    const ids = NODES.filter((n) => n.layer === layer).map((n) => n.id);
    const series = Array.from(
      { length: result.steps },
      (_, t) => ids.reduce((sum, id) => sum + (result.seriesByNode[id][t] ?? 0), 0) / ids.length
    );
    const peak = Math.max(...series);
    return {
      layer,
      name: LAYER_NAMES[layer],
      series,
      peak,
      peakAt: series.indexOf(peak),
      last: series[series.length - 1],
      material: peak >= MATERIAL,
    };
  });
}
