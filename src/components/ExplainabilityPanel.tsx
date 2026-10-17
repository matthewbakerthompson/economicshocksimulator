import { useEffect, useMemo, useRef, useState } from "react";
import { NODES } from "../sim/graphSpec";
import type { ReceiptItem } from "../sim/types";
import { useAppStore } from "../state/store";
import { stressToColor } from "../ui/colors";
import { buildStory } from "../sim/story";

function fmt(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(3)}`;
}

function sortReceiptItems(items: ReceiptItem[]): ReceiptItem[] {
  return [...items].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

export function ExplainabilityPanel() {
  const t = useAppStore((s) => s.t);
  const result = useAppStore((s) => s.result);
  const scenario = useAppStore((s) => s.scenario);
  const setT = useAppStore((s) => s.setT);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId) ?? "consumers_unemployment";

  const node = NODES.find((n) => n.id === selectedNodeId);
  const series = result?.seriesByNode[selectedNodeId];
  const value = series?.[t] ?? 0;
  const receipts = result?.receiptsByNodeByStep[selectedNodeId]?.[t]?.items ?? [];

  const color = stressToColor(value);
  const top = sortReceiptItems(receipts).slice(0, 8);

  const story = useMemo(() => {
    if (!result) return null;
    return buildStory({ result, scenario });
  }, [result, scenario]);

  const consoleRef = useRef<HTMLDivElement | null>(null);
  const [lockToLive, setLockToLive] = useState(true);

  // While playing, stay locked to the current month unless the user scrolls away: pressing play
  // re-locks it. Adjusted during render rather than in an effect, to avoid an extra render pass.
  const [wasPlaying, setWasPlaying] = useState(isPlaying);
  if (isPlaying !== wasPlaying) {
    setWasPlaying(isPlaying);
    if (isPlaying) setLockToLive(true);
  }

  useEffect(() => {
    const el = consoleRef.current;
    if (!el) return;
    if (!lockToLive) return;
    el.scrollTop = el.scrollHeight;
  }, [lockToLive, t, story]);

  return (
    <div className="stack">
      <div className="kpi" style={{ borderColor: "rgba(130,200,255,0.22)" }}>
        <div>
          <strong>{node?.label ?? selectedNodeId}</strong>
          <div className="muted">{node?.description ?? "—"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 16, color }}>{value.toFixed(3)}</div>
          <div className="muted">stress</div>
        </div>
      </div>

      <div>
        <label>Story console</label>
        {!story ? (
          <div className="muted">Run a simulation, then press Play to generate the transcript.</div>
        ) : (
          <div
            ref={consoleRef}
            className="panel"
            style={{
              padding: 10,
              height: 320,
              overflow: "auto",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              fontSize: 12,
              lineHeight: 1.35,
            }}
            onScroll={(e) => {
              const el = e.currentTarget;
              const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
              // If user scrolls up, unlock; if they come back near bottom, relock.
              setLockToLive(nearBottom);
            }}
          >
            {story.map((b) => {
              const age = Math.max(0, t - b.t);
              const opacity = Math.max(0.22, 1 - age * 0.08);
              const isCurrent = b.t === t;
              return (
                <div
                  key={b.t}
                  style={{
                    opacity: isCurrent ? 1 : opacity,
                    padding: "8px 8px",
                    marginBottom: 6,
                    borderRadius: 10,
                    border: isCurrent ? "1px solid rgba(255, 80, 160, 0.35)" : "1px solid rgba(130, 200, 255, 0.10)",
                    background: isCurrent
                      ? "linear-gradient(180deg, rgba(255,80,160,0.12), rgba(120,220,255,0.06))"
                      : "rgba(0,0,0,0.18)",
                  }}
                  onClick={() => setT(b.t)}
                  title="Click to jump to this month"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ color: "rgba(235,245,255,0.92)", fontWeight: 650 }}>
                      [{`Month ${b.t}`}] {b.headline}
                    </div>
                    {isCurrent ? (
                      <div style={{ color: "rgba(255,80,160,0.92)" }}>▶ current</div>
                    ) : (
                      <div style={{ color: "rgba(235,245,255,0.45)" }}>{`Δ`}</div>
                    )}
                  </div>
                  <div style={{ height: 6 }} />
                  {b.bullets.map((line, i) => (
                    <div key={i} style={{ color: "rgba(235,245,255,0.72)" }}>
                      - {line}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="muted">Click any month block to jump. While playing, the console auto-follows the current month.</div>
          <div className="muted">{lockToLive ? "Live follow: ON" : "Live follow: OFF"}</div>
        </div>
      </div>

      <div>
        <label>Why it moved (month {t})</label>
        {top.length === 0 ? (
          <div className="muted">Run a simulation, then click nodes to see receipts.</div>
        ) : (
          <div className="receipt">
            {top.map((it, idx) => (
              <div key={`${it.kind}_${idx}`} className="receiptItem">
                <div>
                  <span style={{ color: it.kind === "shock" ? "rgba(255,80,160,0.95)" : "rgba(235,245,255,0.86)" }}>
                    {it.label}
                  </span>
                  <span className="muted" style={{ marginLeft: 8 }}>
                    {it.kind}
                  </span>
                </div>
                <div className="amt">{fmt(it.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="muted">
        Interpretation: receipts are <strong>directional attributions</strong> (shock + incoming channels − buffers/decay,
        plus a clamp when stress hits 0 or 1), not “true” causal measurement.
      </div>
    </div>
  );
}


