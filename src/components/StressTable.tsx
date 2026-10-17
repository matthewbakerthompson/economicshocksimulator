import { useState } from "react";
import { NODES } from "../sim/graphSpec";
import { fmtDelta } from "../sim/story";
import type { LayerId, NodeId } from "../sim/types";
import { LAYER_NAMES } from "../sim/narrative";
import { useAppStore } from "../state/store";
import { stressColor } from "../ui/colors";

type SortKey = "layer" | "stress" | "change";
const LAYERS: LayerId[] = ["Consumers", "Credit", "Markets"];

type Row = { id: NodeId; label: string; layer: LayerId; value: number; change: number; peak: number; peakAt: number };

/** Every node's stress this month, as a table: the text alternative to the network. */
export function StressTable() {
  const result = useAppStore((s) => s.result);
  const t = useAppStore((s) => s.t);
  const selected = useAppStore((s) => s.selectedNodeId);
  const setSelected = useAppStore((s) => s.setSelectedNodeId);
  const [sort, setSort] = useState<SortKey>("layer");

  if (!result) return <p className="empty tablePad">Running the model…</p>;

  const rows: Row[] = NODES.map((n) => {
    const s = result.seriesByNode[n.id];
    const peak = Math.max(...s);
    return {
      id: n.id,
      label: n.label,
      layer: n.layer,
      value: s[t] ?? 0,
      change: t > 0 ? (s[t] ?? 0) - (s[t - 1] ?? 0) : 0,
      peak,
      peakAt: s.indexOf(peak),
    };
  });

  const header = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort === key ? (key === "layer" ? "ascending" : "descending") : undefined}>
      <button type="button" className="sortButton" onClick={() => setSort(key)}>
        {label}
        {sort === key && <span aria-hidden="true">{key === "layer" ? " ↑" : " ↓"}</span>}
      </button>
    </th>
  );

  const row = (r: Row, showLayer: boolean) => (
    <tr key={r.id} className={r.id === selected ? "selected" : undefined}>
      <th scope="row">
        <button type="button" className="linkButton" aria-pressed={r.id === selected} onClick={() => setSelected(r.id)}>
          {r.label}
        </button>
        {showLayer && <span className="rowLayer">{LAYER_NAMES[r.layer]}</span>}
      </th>
      <td>
        <span className="stressCell">
          <span className="stressBar" aria-hidden="true">
            <span style={{ width: `${r.value * 100}%`, background: stressColor(r.value) }} />
          </span>
          <span className="mono">{r.value.toFixed(3)}</span>
        </span>
      </td>
      <td className={r.change > 0.0005 ? "mono up" : r.change < -0.0005 ? "mono down" : "mono muted"}>
        {t > 0 ? fmtDelta(r.change) : "—"}
      </td>
      <td className="mono muted">
        {r.peak.toFixed(3)} · m{r.peakAt}
      </td>
    </tr>
  );

  const sorted =
    sort === "stress"
      ? [...rows].sort((a, b) => b.value - a.value)
      : sort === "change"
        ? [...rows].sort((a, b) => b.change - a.change)
        : rows;

  return (
    <div className="tableScroll">
      <table className="stressTable">
        <caption>
          Stress on each part of the economy in month {t}
          {t > 0 ? `, and the change since month ${t - 1}` : ""}. Select one to see why it moved.
        </caption>
        <thead>
          <tr>
            {header("layer", "Part of the economy")}
            {header("stress", "Stress")}
            {header("change", "Change")}
            <th scope="col">Peak</th>
          </tr>
        </thead>
        {sort === "layer" ? (
          LAYERS.map((layer) => {
            const group = rows.filter((r) => r.layer === layer);
            const mean = group.reduce((sum, r) => sum + r.value, 0) / group.length;
            return (
              <tbody key={layer}>
                <tr className="groupRow">
                  <th scope="rowgroup" colSpan={4}>
                    {LAYER_NAMES[layer]} <span className="muted">{mean.toFixed(2)} on average</span>
                  </th>
                </tr>
                {group.map((r) => row(r, false))}
              </tbody>
            );
          })
        ) : (
          <tbody>{sorted.map((r) => row(r, true))}</tbody>
        )}
      </table>
    </div>
  );
}
