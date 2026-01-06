import { useEffect, useRef } from "react";
import { useAppStore } from "../state/store";

export function Timeline() {
  const steps = useAppStore((s) => s.steps);
  const t = useAppStore((s) => s.t);
  const tFloat = useAppStore((s) => s.tFloat);
  const setT = useAppStore((s) => s.setT);
  const setPlayhead = useAppStore((s) => s.setPlayhead);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const setIsPlaying = useAppStore((s) => s.setIsPlaying);
  const playIntervalMs = useAppStore((s) => s.playIntervalMs);
  const setPlayIntervalMs = useAppStore((s) => s.setPlayIntervalMs);
  const result = useAppStore((s) => s.result);

  const maxT = Math.max(0, (result?.steps ?? steps) - 1);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
      return;
    }

    const tick = (now: number) => {
      const last = lastRef.current ?? now;
      lastRef.current = now;

      const dt = Math.max(0, Math.min(60, now - last)); // clamp frame delta
      const stepFrac = dt / Math.max(1, playIntervalMs);
      const next = tFloat + stepFrac;

      if (next >= maxT) {
        setPlayhead(maxT);
        setIsPlaying(false);
        rafRef.current = null;
        lastRef.current = null;
        return;
      }

      setPlayhead(next);
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [isPlaying, maxT, playIntervalMs, setIsPlaying, setPlayhead, tFloat]);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <strong>Month</strong>{" "}
          <span className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>
            {t} / {maxT}
          </span>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setIsPlaying(!isPlaying)} disabled={!result}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button className="btn" onClick={() => setPlayhead(0)}>
            Reset
          </button>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={maxT}
        step={1}
        value={t}
        onChange={(e) => setT(parseInt(e.target.value, 10))}
        disabled={!result}
      />

      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Playback pace</label>
          <input
            type="range"
            min={350}
            max={2000}
            step={50}
            value={playIntervalMs}
            onChange={(e) => setPlayIntervalMs(parseInt(e.target.value, 10))}
          />
          <div className="muted">{playIntervalMs} ms / step</div>
        </div>
      </div>

      <div className="muted">Story mode works best around 900–1400ms/step.</div>
    </div>
  );
}


