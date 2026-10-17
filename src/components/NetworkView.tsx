import { useMemo } from "react";
import type { KeyboardEvent } from "react";
import { presetLag } from "../sim/engine";
import { EDGES, NODES } from "../sim/graphSpec";
import type { NodeId, SimulationResult } from "../sim/types";
import { useAppStore } from "../state/store";
import { FOCUS_COLOR, RELIEF_COLOR, stressColor, stressPosition } from "../ui/colors";
import { LAYER_BANDS, NODE_POSITIONS, NODE_RADIUS, VIEW, edgeGeometry, labelLines } from "../ui/networkLayout";

/** A node's stress at a fractional month, interpolated so playback moves smoothly. */
function stressAt(result: SimulationResult | null, id: NodeId, at: number): number {
  const s = result?.seriesByNode[id];
  if (!s || s.length === 0) return 0;
  const x = Math.max(0, Math.min(s.length - 1, at));
  const i = Math.floor(x);
  const j = Math.min(s.length - 1, i + 1);
  return s[i] + (s[j] - s[i]) * (x - i);
}

export function NetworkView() {
  const result = useAppStore((s) => s.result);
  const t = useAppStore((s) => s.t);
  const tFloat = useAppStore((s) => s.tFloat);
  const lagPreset = useAppStore((s) => s.scenario.lagPreset);
  const selected = useAppStore((s) => s.selectedNodeId);
  const hover = useAppStore((s) => s.hoverNodeId);
  const setSelected = useAppStore((s) => s.setSelectedNodeId);
  const setHover = useAppStore((s) => s.setHoverNodeId);

  const geometry = useMemo(() => new Map(EDGES.map((e) => [e.id, edgeGeometry(e)])), []);

  // Stress each edge delivered into this month, from the target's receipts.
  const flows = useMemo(() => {
    const m = new Map<string, number>();
    if (!result || t === 0) return m;
    for (const e of EDGES) {
      const item = result.receiptsByNodeByStep[e.to][t - 1]?.items.find(
        (it) => it.kind === "edge" && it.meta?.from === e.from
      );
      if (item) m.set(e.id, item.amount);
    }
    return m;
  }, [result, t]);

  const focus = hover ?? selected;

  const onNodeKey = (e: KeyboardEvent, id: NodeId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected(id);
    }
  };

  return (
    <div className="network">
      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Stress network: how stress moves from consumers to credit to markets"
      >
        {LAYER_BANDS.map((b, i) => {
          const ids = NODES.filter((n) => n.layer === b.layer).map((n) => n.id);
          const mean = ids.reduce((sum, id) => sum + stressAt(result, id, tFloat), 0) / ids.length;
          return (
            <g key={b.layer} className="band">
              {i > 0 && <line x1={b.x0} x2={b.x0} y1={8} y2={VIEW.height - 8} />}
              <text x={b.x0 + 16} y={18} className="bandLabel">
                {b.layer.toUpperCase()}
                <tspan className="bandMean" dx={8}>
                  avg {mean.toFixed(2)}
                </tspan>
              </text>
            </g>
          );
        })}

        <g className="edges">
          {EDGES.map((e) => {
            const g = geometry.get(e.id)!;
            const lag = presetLag(e.typicalLag, lagPreset);
            const v = stressAt(result, e.from, tFloat - lag);
            const hot = e.from === focus || e.to === focus;
            const color = hot ? FOCUS_COLOR : stressColor(Math.max(0.05, v));
            const opacity = hot ? 1 : 0.2 + 0.45 * stressPosition(v);
            const flow = flows.get(e.id) ?? 0;
            return (
              <g key={e.id}>
                <path
                  d={g.path}
                  className="edge"
                  stroke={color}
                  strokeOpacity={opacity}
                  strokeWidth={(hot ? 1.25 : 0.75) + 2 * e.weight}
                />
                {Math.abs(flow) > 0.001 && (
                  <path
                    d={g.path}
                    className="edgeFlow"
                    stroke={flow > 0 ? "#fff3e8" : RELIEF_COLOR}
                    strokeOpacity={Math.min(0.9, 0.3 + Math.abs(flow) * 12)}
                  />
                )}
                <path d={g.arrow} fill={color} fillOpacity={opacity} />
              </g>
            );
          })}
        </g>

        <g className="nodes">
          {NODES.map((n) => {
            const [x, y] = NODE_POSITIONS[n.id];
            const v = stressAt(result, n.id, tFloat);
            const isSelected = n.id === selected;
            const lines = labelLines(n.label);
            return (
              <g
                key={n.id}
                className={isSelected ? "node selected" : "node"}
                transform={`translate(${x} ${y})`}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${n.label}, stress ${v.toFixed(2)}`}
                onClick={() => setSelected(n.id)}
                onKeyDown={(e) => onNodeKey(e, n.id)}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n.id)}
                onBlur={() => setHover(null)}
              >
                <circle r={24} className="nodeHit" />
                {isSelected && <circle r={18} className="selectionRing" />}
                <circle r={NODE_RADIUS + 4} className="focusRing" />
                <circle r={NODE_RADIUS} fill={stressColor(v)} className={v < 0.01 ? "nodeDot calm" : "nodeDot"} />
                <text className="nodeLabel" y={isSelected ? 31 : 27}>
                  {lines.map((l, i) => (
                    <tspan key={l} x={0} dy={i === 0 ? 0 : 13}>
                      {l}
                    </tspan>
                  ))}
                </text>
                <text className="nodeValue" y={(isSelected ? 31 : 27) + 13 * lines.length}>
                  {v.toFixed(2)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
