import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { NODES } from "../sim/graphSpec";
import { type LayerSummary, summarizeLayers } from "../sim/layers";
import type { CausalEvent, LayerId, NodeId, SimulationResult } from "../sim/types";
import { useAppStore } from "../state/store";
import { CONTEXT, RELIEF, SIGNAL } from "../ui/colors";
import { Icon } from "./Icon";

type Props = {
  mode: "story" | "explore";
  /** Story: the layer the chapter is about; the others are drawn as context. */
  focus?: LayerId | null;
  /** Story: the chapter's months. */
  range?: [number, number] | null;
  /** Story: the part of the economy the chapter is about, drawn as a line in its layer with its peak marked. */
  node?: NodeId | null;
  /** Story: draw the chart up to here even when the playhead is earlier, so going back hides nothing. */
  revealTo?: number;
  /** Story: a second run drawn over the first, for comparison. */
  compare?: SimulationResult | null;
  /** Story: the stress at the top of each band. Stories scale to their own run; Explore uses the full 0–1 scale. */
  scaleMax?: number;
  /** Explore: the layer opened up into its nodes. */
  expanded?: LayerId | null;
  onToggleLayer?: (layer: LayerId) => void;
};

type Row =
  | { kind: "layer"; layer: LayerId; y: number; h: number; summary: LayerSummary }
  | { kind: "node"; layer: LayerId; id: NodeId; label: string; y: number; h: number; series: number[] };

const LANE_H = 18;
const AXIS_H = 26;

function eventLabel(e: CausalEvent): string {
  switch (e.type) {
    case "unemployment":
      return `Unemployment, ${Math.round(e.magnitude * 10) / 10} ${e.magnitude === 1 ? "point" : "points"}`;
    case "stagflation":
      return "Stagflation";
    case "oil_glut":
      return "Oil glut";
  }
}

// Node labels that read as plural ("Missed payments peak", not "peaks").
const PLURAL = new Set<NodeId>(["consumers_delinquency", "credit_bank_losses", "credit_borrow_cost"]);

function useWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    // Measure once straight away too; some environments are slow to deliver the first observation.
    queueMicrotask(() => setWidth(Math.round(el.getBoundingClientRect().width)));
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** Stress over time for households, banks and markets, as three aligned bands. */
export function LayerBands({
  mode,
  focus = null,
  range = null,
  node = null,
  revealTo = 0,
  compare = null,
  scaleMax = 1,
  expanded = null,
  onToggleLayer,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const width = useWidth(ref);
  const result = useAppStore((s) => s.result);
  const events = useAppStore((s) => s.scenario.events);
  const tFloat = useAppStore((s) => s.tFloat);
  const t = useAppStore((s) => s.t);
  const selected = useAppStore((s) => s.selectedNodeId);
  const setT = useAppStore((s) => s.setT);
  const setSelected = useAppStore((s) => s.setSelectedNodeId);
  const dragging = useRef(false);

  const layers = useMemo(() => (result ? summarizeLayers(result) : []), [result]);
  const compareLayers = useMemo(() => (compare ? summarizeLayers(compare) : null), [compare]);
  const months = result?.steps ?? 0;
  const last = Math.max(1, months - 1);
  const narrow = width < 520;
  const labelW = narrow ? 112 : mode === "explore" ? (width < 700 ? 168 : 200) : 176;
  const x0 = labelW;
  const x1 = Math.max(x0 + 10, width - 14);
  const x = (m: number) => x0 + (m / last) * (x1 - x0);
  const lanes = events.filter((e) => e.durationSteps > 0 && e.magnitude > 0 && e.startStep < months);
  const lanesH = lanes.length * LANE_H + (lanes.length ? 10 : 0);

  const rows: Row[] = [];
  let y = lanesH;
  const layerH = mode === "story" ? (narrow ? 64 : 80) : narrow ? 56 : 68;
  for (const s of layers) {
    rows.push({ kind: "layer", layer: s.layer, y, h: layerH, summary: s });
    y += layerH + 14;
    if (expanded === s.layer && result) {
      for (const n of NODES.filter((n) => n.layer === s.layer)) {
        rows.push({ kind: "node", layer: s.layer, id: n.id, label: n.label, y, h: 30, series: result.seriesByNode[n.id] });
        y += 36;
      }
      y += 6;
    }
  }
  const plotBottom = y - 14;
  const height = plotBottom + AXIS_H;

  const valueAt = (series: number[], at: number) => {
    const i = Math.max(0, Math.min(series.length - 1, Math.floor(at)));
    const j = Math.min(series.length - 1, i + 1);
    return series[i] + (series[j] - series[i]) * (at - i);
  };
  const area = (series: number[], top: number, h: number) => {
    const pts = series.map((v, m) => `${x(m).toFixed(1)},${(top + h - (v / scaleMax) * (h - 6)).toFixed(1)}`);
    return { line: `M${pts.join("L")}`, fill: `M${x(0)},${top + h}L${pts.join("L")}L${x(last)},${top + h}Z` };
  };

  const reveal = mode === "story" ? x(Math.max(tFloat, revealTo)) : x1;
  const monthFromX = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return t;
    return Math.round(((clientX - rect.left - x0) / (x1 - x0)) * last);
  };
  const onPointerDown = (e: PointerEvent<SVGRectElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setT(monthFromX(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<SVGRectElement>) => {
    if (dragging.current) setT(monthFromX(e.clientX));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowLeft: t - 1, ArrowRight: t + 1, Home: 0, End: last };
    if (e.key in step) {
      e.preventDefault();
      setT(step[e.key]);
    }
  };

  const layerRow = (layer: LayerId) => rows.find((r) => r.kind === "layer" && r.layer === layer)!;
  const nodeSpec = node ? NODES.find((n) => n.id === node)! : null;
  const nodeSeries = node && result ? result.seriesByNode[node] : null;
  const nodePeak = nodeSeries ? Math.max(...nodeSeries) : 0;
  const nodePeakAt = nodeSeries ? nodeSeries.indexOf(nodePeak) : 0;
  const ticks = Array.from({ length: months }, (_, m) => m).filter((m) => m % (months > 12 ? 3 : 2) === 0 || m === last);

  return (
    <div
      ref={ref}
      className={`bands bands-${mode}`}
      role="slider"
      tabIndex={0}
      aria-label="Month on the stress chart"
      aria-valuemin={0}
      aria-valuemax={last}
      aria-valuenow={t}
      aria-valuetext={`Month ${t}`}
      onKeyDown={onKeyDown}
      style={{ height: width ? height : undefined }}
    >
      {width > 0 && result && (
        <>
          <svg width={width} height={height} aria-hidden="true">
            <defs>
              <clipPath id={`reveal-${mode}`}>
                <rect x={0} y={0} width={reveal} height={height} />
              </clipPath>
            </defs>

            {range && (
              <rect
                className="chapterSpan"
                x={x(range[0] - 0.5 < 0 ? 0 : range[0] - 0.5)}
                y={0}
                width={Math.max(4, x(Math.min(last, range[1] + 0.5)) - x(Math.max(0, range[0] - 0.5)))}
                height={plotBottom}
              />
            )}

            {lanes.map((e, i) => (
              <rect
                key={e.id}
                className="laneBar"
                x={x(Math.max(0, e.startStep - 0.5))}
                y={i * LANE_H + LANE_H / 2 - 2}
                width={Math.max(3, x(Math.min(last, e.startStep + e.durationSteps - 0.5)) - x(Math.max(0, e.startStep - 0.5)))}
                height={4}
                rx={2}
              />
            ))}

            {rows.map((r) => {
              if (r.kind === "layer") {
                // When a comparison is drawn, the run itself becomes the grey backdrop for the two lines.
                const isFocus = !compareLayers && (mode === "explore" || focus === null || focus === r.layer);
                const { line, fill } = area(r.summary.series, r.y, r.h);
                return (
                  <g key={r.layer}>
                    <line className="baseline" x1={x0} x2={x1} y1={r.y + r.h} y2={r.y + r.h} />
                    <path d={line} className="ghost" />
                    <g clipPath={`url(#reveal-${mode})`}>
                      <path d={fill} fill={isFocus ? SIGNAL : CONTEXT} fillOpacity={isFocus ? 0.85 : 0.55} />
                      <path
                        d={line}
                        fill="none"
                        stroke={isFocus || compareLayers ? SIGNAL : "#8f8f8a"}
                        strokeWidth={compareLayers ? 2 : 1.5}
                      />
                      {nodeSpec && nodeSeries && nodeSpec.layer === r.layer && (
                        <path d={area(nodeSeries, r.y, r.h).line} className="nodeTrace" />
                      )}
                    </g>
                    {compareLayers && (
                      <path
                        d={area(compareLayers.find((c) => c.layer === r.layer)!.series, r.y, r.h).line}
                        fill="none"
                        stroke={RELIEF}
                        strokeWidth={2}
                      />
                    )}
                  </g>
                );
              }
              const { line } = area(r.series, r.y, r.h);
              const isSel = r.id === selected;
              return (
                <g key={r.id}>
                  <line className="baseline" x1={x0} x2={x1} y1={r.y + r.h} y2={r.y + r.h} />
                  <path d={line} fill="none" stroke={isSel ? SIGNAL : "#5f5f5b"} strokeWidth={isSel ? 2 : 1.25} />
                </g>
              );
            })}

            {mode === "story" && nodeSpec && nodeSeries && nodePeak > 0.005 && Math.max(tFloat, revealTo) >= nodePeakAt && (
              <g className="annotation">
                {(() => {
                  const r = layerRow(nodeSpec.layer);
                  const px = x(nodePeakAt);
                  const py = r.y + r.h - (nodePeak / scaleMax) * (r.h - 6);
                  const anchorEnd = px > x1 - 220;
                  return (
                    <>
                      <circle cx={px} cy={py} r={4.5} className="peakDot" />
                      <text x={px + (anchorEnd ? -10 : 10)} y={py - 8} textAnchor={anchorEnd ? "end" : "start"}>
                        {nodeSpec.label} {PLURAL.has(nodeSpec.id) ? "peak" : "peaks"} in month {nodePeakAt}
                      </text>
                    </>
                  );
                })()}
              </g>
            )}

            <line className="playhead" x1={x(tFloat)} x2={x(tFloat)} y1={0} y2={plotBottom} />
            {ticks.map((m) => (
              <text key={m} className="tick" x={x(m)} y={plotBottom + 17} textAnchor="middle">
                {m}
              </text>
            ))}
            <rect
              className="seek"
              x={x0}
              y={0}
              width={x1 - x0}
              height={height}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={() => (dragging.current = false)}
              onPointerCancel={() => (dragging.current = false)}
            />
          </svg>

          {lanes.map((e, i) => (
            <span key={e.id} className="laneLabel" style={{ top: i * LANE_H, width: labelW - 14 }}>
              {eventLabel(e)}
            </span>
          ))}
          {rows.map((r) =>
            r.kind === "layer" ? (
              <div
                key={r.layer}
                className={mode === "story" && focus && focus !== r.layer ? "rowLabel context" : "rowLabel"}
                style={{ top: r.y, width: labelW - 14 }}
              >
                {mode === "explore" && onToggleLayer ? (
                  <button
                    type="button"
                    className="rowName expander"
                    aria-expanded={expanded === r.layer}
                    onClick={() => onToggleLayer(r.layer)}
                  >
                    <Icon name={expanded === r.layer ? "chevron-down" : "chevron-right"} size={14} />
                    {r.summary.name}
                  </button>
                ) : (
                  <span className="rowName">{r.summary.name}</span>
                )}
                {mode === "explore" && <span className="rowValue">{valueAt(r.summary.series, tFloat).toFixed(2)}</span>}
              </div>
            ) : (
              <button
                key={r.id}
                type="button"
                className={r.id === selected ? "nodeLabelRow selected" : "nodeLabelRow"}
                style={{ top: r.y + 1, width: labelW - 14 }}
                aria-pressed={r.id === selected}
                title={r.label}
                onClick={() => setSelected(r.id)}
              >
                <span>{r.label}</span>
                <span className="rowValue small">{valueAt(r.series, tFloat).toFixed(2)}</span>
              </button>
            )
          )}
          <span className="playheadLabel" style={{ left: Math.min(x1 - 30, Math.max(x0 + 30, x(tFloat))), top: plotBottom + 4 }}>
            Month {t}
          </span>
          <span className="axisName" style={{ top: plotBottom + 6, width: labelW - 14 }}>
            Month
          </span>
        </>
      )}
    </div>
  );
}

