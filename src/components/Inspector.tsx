import { presetLag } from "../sim/engine";
import { EDGES, NODES } from "../sim/graphSpec";
import { fmtDelta, nodeLabel } from "../sim/story";
import { useAppStore } from "../state/store";
import { stressColor } from "../ui/colors";
import { VISIBLE, receiptRows } from "../ui/receipts";
import { Icon } from "./Icon";

const SPARK_W = 312;
const SPARK_H = 72;
const BAR_HALF = 42;

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

  return (
    <div className="inspectorInner">
      <header className="nodeHeader">
        <p className="eyebrow">
          {node.layer} <span className="muted">· selected node</span>
        </p>
        <h2 className="nodeName">{node.label}</h2>
        <p className="nodeDescription">{node.description}</p>
      </header>

      <section className="valueBlock" aria-label="Stress level">
        <div className="valueRow">
          <span className="value">
            <span className="valueNumber">{value.toFixed(3)}</span>
            <span className="valueUnit">at m{t}</span>
          </span>
          <DeltaChip delta={delta} show={t > 0} />
        </div>
        <Sparkline series={series} tFloat={tFloat} />
      </section>

      <section className="why" aria-labelledby="why-heading">
        <div className="sectionHead">
          <h3 id="why-heading" className="sectionTitle">
            Why it moved
          </h3>
          {t > 0 && (
            <span className="mono muted">
              m{t - 1} → m{t}
            </span>
          )}
        </div>
        {t === 0 ? (
          <p className="empty">Month 0 is the baseline: every node starts at zero.</p>
        ) : rows.length === 0 ? (
          <p className="empty">Nothing moved this node this month.</p>
        ) : (
          <ul className="receipts">
            {rows.map((r) => {
              const w = Math.max(2, (Math.abs(r.amount) / scale) * BAR_HALF);
              const title = r.from ? (
                <button type="button" className="linkButton" onClick={() => setSelected(r.from!)}>
                  {r.title}
                </button>
              ) : (
                r.title
              );
              return (
                <li key={r.key} className={r.amount < 0 ? "receipt negative" : "receipt"}>
                  <span className="receiptText">
                    <span className="receiptTitle">{title}</span>
                    <span className="receiptDetail">{r.detail}</span>
                  </span>
                  <svg className="receiptBar" viewBox={`0 0 ${2 * BAR_HALF + 4} 10`} aria-hidden="true">
                    <line x1={BAR_HALF + 2} x2={BAR_HALF + 2} y1={0} y2={10} />
                    <rect x={r.amount >= 0 ? BAR_HALF + 3 : BAR_HALF + 1 - w} y={1} width={w} height={8} rx={2} />
                  </svg>
                  <span className="receiptAmount">{fmtDelta(r.amount)}</span>
                </li>
              );
            })}
            <li className="receipt net">
              <span className="receiptTitle">Net change</span>
              <span className="mono">
                {prev.toFixed(3)} → {value.toFixed(3)}
                <span className="netDelta">{fmtDelta(delta)}</span>
              </span>
            </li>
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="passes" aria-labelledby="passes-heading">
          <h3 id="passes-heading" className="sectionTitle">
            Passes stress to
          </h3>
          {outgoing.map((e) => (
            <button key={e.id} type="button" className="passRow" onClick={() => setSelected(e.to)}>
              <span className="dot" style={{ background: stressColor(result?.seriesByNode[e.to][t] ?? 0) }} />
              <span className="passName">{nodeLabel(e.to)}</span>
              <span className="mono muted">
                w {e.weight.toFixed(2)} · lag {presetLag(e.typicalLag, lagPreset)}
              </span>
              <span className="spacer" />
              <Icon name="chevron-right" />
            </button>
          ))}
        </section>
      )}

      <p className="footnote">
        Receipts are directional attributions under the model's assumptions, not causal estimates. They always sum to
        the change.
      </p>
    </div>
  );
}

function DeltaChip({ delta, show }: { delta: number; show: boolean }) {
  if (!show) return null;
  if (Math.abs(delta) < 0.0005) return <span className="deltaChip flat">no change</span>;
  const up = delta > 0;
  return (
    <span className={up ? "deltaChip up" : "deltaChip down"}>
      <Icon name={up ? "arrow-up-right" : "arrow-down-right"} size={13} />
      {fmtDelta(delta)}
    </span>
  );
}

function Sparkline({ series, tFloat }: { series: number[]; tFloat: number }) {
  if (series.length < 2) return <div className="sparkline" />;
  const n = series.length - 1;
  const x = (i: number) => (i / n) * SPARK_W;
  const y = (v: number) => SPARK_H - v * SPARK_H;
  const line = series.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const at = Math.max(0, Math.min(n, tFloat));
  const i0 = Math.floor(at);
  const vNow = series[i0] + ((series[Math.min(n, i0 + 1)] ?? series[i0]) - series[i0]) * (at - i0);
  const peak = Math.max(...series);
  const peakAt = series.indexOf(peak);
  const peakRight = peakAt > n * 0.6;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${SPARK_W} ${SPARK_H + 18}`}
      role="img"
      aria-label={`Stress over time, peaking at ${peak.toFixed(3)} in month ${peakAt}`}
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e2516b" stopOpacity={0.35} />
          <stop offset="1" stopColor="#e2516b" stopOpacity={0} />
        </linearGradient>
      </defs>
      <line className="grid" x1={0} x2={SPARK_W} y1={SPARK_H / 2} y2={SPARK_H / 2} />
      <line className="baseline" x1={0} x2={SPARK_W} y1={SPARK_H - 0.5} y2={SPARK_H - 0.5} />
      <path d={`${line} L${SPARK_W} ${SPARK_H} L0 ${SPARK_H} Z`} fill="url(#sparkFill)" />
      <path d={line} className="sparkLine" />
      <line className="playhead" x1={x(at)} x2={x(at)} y1={0} y2={SPARK_H} />
      <circle className="playheadDot" cx={x(at)} cy={y(vNow)} r={4} />
      <text className="axis" x={SPARK_W} y={SPARK_H / 2 - 4} textAnchor="end">
        0.5
      </text>
      <text className="axis" x={0} y={SPARK_H + 14}>
        m0
      </text>
      <text className="axis" x={SPARK_W} y={SPARK_H + 14} textAnchor="end">
        m{n}
      </text>
      {peak > 0.001 && (
        <text
          className="peakNote"
          x={x(peakAt) + (peakRight ? -8 : 8)}
          y={Math.max(10, y(peak) - 6)}
          textAnchor={peakRight ? "end" : "start"}
        >
          peak {peak.toFixed(3)} · m{peakAt}
        </text>
      )}
    </svg>
  );
}
