import { presetLag } from "../sim/engine";
import { EDGES, NODES } from "../sim/graphSpec";
import { LAYER_NAMES } from "../sim/narrative";
import { fmtDelta, nodeLabel } from "../sim/story";
import { useAppStore } from "../state/store";
import { RELIEF, SIGNAL, stressColor } from "../ui/colors";
import { VISIBLE, receiptRows } from "../ui/receipts";
import { Icon } from "./Icon";

const CHART_W = 300;
const CHART_H = 64;
const BAR_HALF = 34;

/** The selected part of the economy: its stress over time, and the receipts for this month's move. */
export function Inspector() {
  const result = useAppStore((s) => s.result);
  const t = useAppStore((s) => s.t);
  const tFloat = useAppStore((s) => s.tFloat);
  const lagPreset = useAppStore((s) => s.scenario.lagPreset);
  const selected = useAppStore((s) => s.selectedNodeId);
  const setSelected = useAppStore((s) => s.setSelectedNodeId);

  const node = NODES.find((n) => n.id === selected)!;
  const series = result?.seriesByNode[selected] ?? [];
  const value = series[t] ?? 0;
  const prev = t > 0 ? (series[t - 1] ?? 0) : value;
  const delta = value - prev;
  // Rows that would print as ±0.000 say nothing; the net row still shows the exact move.
  const rows = result ? receiptRows(result, selected, t).filter((r) => Math.abs(r.amount) >= VISIBLE) : [];
  const scale = Math.max(1e-9, ...rows.map((r) => Math.abs(r.amount)));
  const outgoing = EDGES.filter((e) => e.from === selected);
  const peak = series.length ? Math.max(...series) : 0;
  const peakAt = series.indexOf(peak);

  const change =
    t === 0
      ? "the starting month"
      : Math.abs(delta) < VISIBLE
        ? `unchanged from month ${t - 1}`
        : `${delta > 0 ? "up" : "down"} ${Math.abs(delta).toFixed(2)} from month ${t - 1}`;

  return (
    <div className="inspectorInner">
      <header className="nodeHeader">
        <p className="layerName">{LAYER_NAMES[node.layer]}</p>
        <h2>{node.label}</h2>
        <p className="nodeDescription">{node.description}</p>
      </header>

      <section className="nodeLevel" aria-label="Stress level">
        <p className="levelSentence">
          <span className="levelNumber">{value.toFixed(2)}</span> in month {t}, {change}.
        </p>
        <NodeChart series={series} tFloat={tFloat} />
        <p className="chartCaption">
          <span>Month 0</span>
          {peak > 0.005 && (
            <span>
              Peak {peak.toFixed(2)} in month {peakAt}
            </span>
          )}
          <span>Month {Math.max(0, series.length - 1)}</span>
        </p>
      </section>

      <section className="why" aria-labelledby="why-heading">
        <h3 id="why-heading">{t === 0 ? "Why it moved" : `Why it moved from month ${t - 1} to ${t}`}</h3>
        {t === 0 ? (
          <p className="empty">Month 0 is the baseline: everything starts calm.</p>
        ) : rows.length === 0 ? (
          <p className="empty">Nothing moved this month.</p>
        ) : (
          <ul className="receipts">
            {rows.map((r) => {
              const w = Math.max(2, (Math.abs(r.amount) / scale) * BAR_HALF);
              return (
                <li key={r.key} className={r.amount < 0 ? "receipt negative" : "receipt"}>
                  <span className="receiptText">
                    <span className="receiptTitle">
                      {r.from ? (
                        <button type="button" className="linkButton" onClick={() => setSelected(r.from!)}>
                          {r.title}
                        </button>
                      ) : (
                        r.title
                      )}
                    </span>
                    <span className="receiptDetail">{r.detail}</span>
                  </span>
                  <svg className="receiptBar" viewBox={`0 0 ${2 * BAR_HALF + 4} 10`} aria-hidden="true">
                    <line x1={BAR_HALF + 2} x2={BAR_HALF + 2} y1={0} y2={10} />
                    <rect
                      x={r.amount >= 0 ? BAR_HALF + 3 : BAR_HALF + 1 - w}
                      y={1}
                      width={w}
                      height={8}
                      fill={r.amount >= 0 ? SIGNAL : RELIEF}
                    />
                  </svg>
                  <span className="receiptAmount">{fmtDelta(r.amount)}</span>
                </li>
              );
            })}
            <li className="receipt net">
              <span className="receiptTitle">Net change</span>
              <span className="receiptAmount">
                {prev.toFixed(3)} to {value.toFixed(3)}, {fmtDelta(delta)}
              </span>
            </li>
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="passes" aria-labelledby="passes-heading">
          <h3 id="passes-heading">Passes stress to</h3>
          {outgoing.map((e) => {
            const lag = presetLag(e.typicalLag, lagPreset);
            return (
              <button key={e.id} type="button" className="passRow" onClick={() => setSelected(e.to)}>
                <span className="swatch" style={{ background: stressColor(result?.seriesByNode[e.to][t] ?? 0) }} />
                <span className="passText">
                  <span className="passName">{nodeLabel(e.to)}</span>
                  <span className="passDetail">
                    Weight {e.weight.toFixed(2)}, {lag === 0 ? "no lag" : `${lag}-month lag`}
                  </span>
                </span>
                <Icon name="chevron-right" size={16} />
              </button>
            );
          })}
        </section>
      )}

      <p className="footnote">
        Receipts are attributions under the model's assumptions, not causal estimates. They add up to the change.
      </p>
    </div>
  );
}

/** Stress over the whole run, with the playhead. Lines only, so it stays legible at any width. */
function NodeChart({ series, tFloat }: { series: number[]; tFloat: number }) {
  if (series.length < 2) return <div className="nodeChart" />;
  const n = series.length - 1;
  const x = (i: number) => (i / n) * CHART_W;
  const y = (v: number) => CHART_H - 2 - v * (CHART_H - 4);
  const line = series.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const at = Math.max(0, Math.min(n, tFloat));
  return (
    <svg className="nodeChart" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true">
      <line className="grid" x1={0} x2={CHART_W} y1={y(0.5)} y2={y(0.5)} vectorEffect="non-scaling-stroke" />
      <line className="baseline" x1={0} x2={CHART_W} y1={y(0)} y2={y(0)} vectorEffect="non-scaling-stroke" />
      <path d={line} className="nodeLine" vectorEffect="non-scaling-stroke" />
      <line className="playhead" x1={x(at)} x2={x(at)} y1={0} y2={CHART_H} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
