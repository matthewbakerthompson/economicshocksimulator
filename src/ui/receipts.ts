import { EDGES } from "../sim/graphSpec";
import { nodeLabel } from "../sim/story";
import type { NodeId, ReceiptItem, SimulationResult } from "../sim/types";

export type ReceiptRow = {
  key: string;
  kind: ReceiptItem["kind"];
  title: string;
  detail: string;
  amount: number;
  /** The upstream node, for edge receipts. */
  from?: NodeId;
};

function pct(x: number): string {
  return `${(x * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

function lagText(lag: number): string {
  return lag === 0 ? "Same month" : `${lag}-month lag`;
}

function eventTitle(label: string): string {
  const name = label.replace(/^(Event|Interaction): /, "").replace(/ \(.*\)$/, "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function eventDetail(label: string): string {
  const inner = /\((.*)\)$/.exec(label)?.[1];
  return inner ? `Direct effect: ${inner}.` : "Direct effect of the event.";
}

function toRow(nodeId: NodeId, it: ReceiptItem, i: number): ReceiptRow | null {
  switch (it.kind) {
    case "shock":
      if (it.meta?.kind === "note") return null;
      return {
        key: `shock_${i}`,
        kind: it.kind,
        // Event labels read "Event: stagflation (confidence pressure)".
        title: eventTitle(it.label),
        detail: eventDetail(it.label),
        amount: it.amount,
      };
    case "edge": {
      const from = it.meta?.from as NodeId;
      const edge = EDGES.find((e) => e.from === from && e.to === nodeId);
      return {
        key: `edge_${from}`,
        kind: it.kind,
        title: nodeLabel(from),
        detail: `${edge?.label ?? "Channel"}. ${lagText(Number(it.meta?.lag))}, weight ${Number(it.meta?.weight).toFixed(2)}.`,
        amount: it.amount,
        from,
      };
    }
    case "dampener":
      return {
        key: "buffers",
        kind: it.kind,
        title: "Buffers",
        detail: `Absorb ${pct(Number(it.meta?.strength))} of the stress carried into the month.`,
        amount: it.amount,
      };
    case "clamp":
      return {
        key: "clamp",
        kind: it.kind,
        title: it.amount < 0 ? "Capped at 1" : "Floored at 0",
        detail: it.amount < 0 ? "Stress can't go above 1, the most severe." : "Relief can't take stress below 0, calm.",
        amount: it.amount,
      };
  }
}

/** The smallest amount that shows as non-zero with three decimals. */
export const VISIBLE = 0.0005;

const ORDER: Record<ReceiptItem["kind"], number> = { shock: 0, edge: 0, dampener: 1, clamp: 2 };

/**
 * The receipts behind a node's move into month t (from t − 1), biggest drivers first, then
 * buffers and any clamp. They sum to the change.
 */
export function receiptRows(result: SimulationResult, nodeId: NodeId, t: number): ReceiptRow[] {
  if (t <= 0) return [];
  const items = result.receiptsByNodeByStep[nodeId]?.[t - 1]?.items ?? [];
  const rows = items
    .map((it, i) => toRow(nodeId, it, i))
    .filter((r): r is ReceiptRow => r !== null)
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || Math.abs(b.amount) - Math.abs(a.amount));

  // Channels that would print as ±0.000 fold into one row, so the rows still sum to the move.
  const small = rows.filter((r) => r.kind === "edge" && Math.abs(r.amount) < VISIBLE);
  if (small.length < 2) return rows;
  const merged: ReceiptRow = {
    key: "smaller",
    kind: "edge",
    title: `${small.length} smaller channels`,
    detail: small.map((r) => r.title).join(", "),
    amount: small.reduce((sum, r) => sum + r.amount, 0),
  };
  const kept = rows.filter((r) => !small.includes(r));
  const at = kept.findIndex((r) => ORDER[r.kind] > 0);
  kept.splice(at < 0 ? kept.length : at, 0, merged);
  return kept;
}

/** The drivers worth naming in prose: shocks and channels that round to a non-zero amount. */
export function namedDrivers(rows: ReceiptRow[], max = 2): ReceiptRow[] {
  return rows
    .filter((r) => (r.kind === "shock" || r.kind === "edge") && r.key !== "smaller" && Math.abs(r.amount) >= VISIBLE)
    .slice(0, max);
}
