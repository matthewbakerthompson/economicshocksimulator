import { useEffect } from "react";
import { useAppStore } from "../state/store";

export function Timeline() {
  const steps = useAppStore((s) => s.steps);
  const t = useAppStore((s) => s.t);
  const setT = useAppStore((s) => s.setT);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const setIsPlaying = useAppStore((s) => s.setIsPlaying);
  const playIntervalMs = useAppStore((s) => s.playIntervalMs);
  const setPlayIntervalMs = useAppStore((s) => s.setPlayIntervalMs);
  const result = useAppStore((s) => s.result);

  const maxT = Math.max(0, (result?.steps ?? steps) - 1);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setT((prev) => {
        const next = prev + 1;
        if (next > maxT) {
          // Stop at the end so the story console can be reviewed by scrolling back.
          setIsPlaying(false);
          return maxT;
        }
        return next;
      });
    }, playIntervalMs);
    return () => window.clearInterval(id);
  }, [isPlaying, maxT, playIntervalMs, setIsPlaying, setT]);

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
          <button className="btn" onClick={() => setT(0)}>
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


