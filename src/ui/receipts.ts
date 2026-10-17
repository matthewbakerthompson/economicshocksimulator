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

function toRow(nodeId: NodeId, it: ReceiptItem, i: number): ReceiptRow | null {
  switch (it.kind) {
    case "shock":
      if (it.meta?.kind === "note") return null;
      return {
        key: `shock_${i}`,
        kind: it.kind,
        title: it.label.replace(/^Event: /, "").replace(/^\w/, (c) => c.toUpperCase()),
        detail: "event shock",
        amount: it.amount,
      };
    case "edge": {
      const from = it.meta?.from as NodeId;
      const edge = EDGES.find((e) => e.from === from && e.to === nodeId);
      return {
        key: `edge_${from}`,
        kind: it.kind,
        title: nodeLabel(from),
        detail: `${edge?.label ?? "channel"} · lag ${it.meta?.lag} · w ${Number(it.meta?.weight).toFixed(2)}`,
        amount: it.amount,
        from,
      };
    }
    case "dampener":
      return {
        key: "buffers",
        kind: it.kind,
        title: "Buffers",
        detail: `absorb ${pct(Number(it.meta?.strength))} of the stress carried in`,
        amount: it.amount,
      };
    case "clamp":
      return {
        key: "clamp",
        kind: it.kind,
        title: it.amount < 0 ? "Cap at 1" : "Floor at 0",
        detail: "stress stays within 0–1",
        amount: it.amount,
      };
  }
}

const ORDER: Record<ReceiptItem["kind"], number> = { shock: 0, edge: 0, dampener: 1, clamp: 2 };

/**
 * The receipts behind a node's move into month t (from t − 1), biggest drivers first, then
 * buffers and any clamp. They sum to the change.
 */
export function receiptRows(result: SimulationResult, nodeId: NodeId, t: number): ReceiptRow[] {
  if (t <= 0) return [];
  const items = result.receiptsByNodeByStep[nodeId]?.[t - 1]?.items ?? [];
  return items
    .map((it, i) => toRow(nodeId, it, i))
    .filter((r): r is ReceiptRow => r !== null)
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || Math.abs(b.amount) - Math.abs(a.amount));
}
