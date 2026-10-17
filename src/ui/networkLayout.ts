import type { EdgeSpec } from "../sim/graphSpec";
import type { LayerId, NodeId } from "../sim/types";

/** The network is drawn in a fixed 760 × 400 coordinate space and scaled to fit. */
export const VIEW = { width: 760, height: 400 } as const;
export const NODE_RADIUS = 12;

/**
 * Hand-tuned positions: one band per layer, read left to right as stress moves from
 * households to banks to markets. Feedback edges (right to left) bow away from the labels.
 */
export const NODE_POSITIONS: Record<NodeId, [number, number]> = {
  consumers_unemployment: [64, 218],
  consumers_income: [156, 266],
  consumers_savings: [156, 350],
  consumers_confidence: [252, 74],
  consumers_demand: [252, 170],
  consumers_delinquency: [252, 314],
  credit_borrow_cost: [366, 170],
  credit_bank_capital: [448, 258],
  credit_access: [448, 350],
  credit_bank_losses: [531, 170],
  credit_standards: [531, 306],
  markets_risk: [638, 122],
  markets_liquidity: [638, 218],
  markets_volatility: [722, 74],
};

export const LAYER_BANDS: Array<{ layer: LayerId; x0: number; x1: number }> = [
  { layer: "Consumers", x0: 0, x1: 316 },
  { layer: "Credit", x0: 316, x1: 584 },
  { layer: "Markets", x0: 584, x1: 760 },
];

// Feedback edges bow 42 units toward the side away from their source; this one bows the
// other way so it clears the Bank Losses node.
const BEND_OVERRIDES: Record<string, number> = { liq_to_cost: 46 };

export type EdgeGeometry = { path: string; arrow: string };

const r1 = (n: number) => Math.round(n * 10) / 10;

export function edgeGeometry(e: EdgeSpec): EdgeGeometry {
  const [sx, sy] = NODE_POSITIONS[e.from];
  const [tx, ty] = NODE_POSITIONS[e.to];
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy);
  const s = [sx + (dx / len) * NODE_RADIUS, sy + (dy / len) * NODE_RADIUS];
  // Stop short of the target so the arrowhead sits just outside its circle.
  const t = [tx - (dx / len) * (NODE_RADIUS + 5), ty - (dy / len) * (NODE_RADIUS + 5)];

  let c1: number[];
  let c2: number[];
  if (Math.abs(dx) < 4) {
    c1 = [s[0], s[1] + dy / 3];
    c2 = [t[0], t[1] - dy / 3];
  } else {
    const k = 0.45 * Math.abs(dx);
    const bend = BEND_OVERRIDES[e.id] ?? (dx < 0 ? (ty <= sy ? -42 : 42) : 0);
    c1 = [s[0] + Math.sign(dx) * k, s[1] + bend];
    c2 = [t[0] - Math.sign(dx) * k, t[1] + bend];
  }
  const path = `M${r1(s[0])} ${r1(s[1])} C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(t[0])} ${r1(t[1])}`;

  const ang = Math.atan2(t[1] - c2[1], t[0] - c2[0]);
  const tip = [t[0] + Math.cos(ang) * 5, t[1] + Math.sin(ang) * 5];
  const bx = tip[0] - Math.cos(ang) * 7;
  const by = tip[1] - Math.sin(ang) * 7;
  const w = 4;
  const arrow =
    `M${r1(tip[0])} ${r1(tip[1])} L${r1(bx + Math.sin(ang) * w)} ${r1(by - Math.cos(ang) * w)} ` +
    `L${r1(bx - Math.sin(ang) * w)} ${r1(by + Math.cos(ang) * w)} Z`;
  return { path, arrow };
}

/** Splits long labels onto two lines so they fit under a node. */
export function labelLines(label: string): string[] {
  if (label.length <= 16 || !label.includes(" ")) return [label];
  const i = label.indexOf(" ");
  return [label.slice(0, i), label.slice(i + 1)];
}
