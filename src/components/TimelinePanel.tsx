import { useEffect, useMemo } from "react";
import type { KeyboardEvent } from "react";
import { NODES } from "../sim/graphSpec";
import { eventName } from "../sim/story";
import type { LayerId, NodeId } from "../sim/types";
import { SPEEDS, useAppStore } from "../state/store";
import { EVENT_COLORS, stressColor } from "../ui/colors";
import { Icon } from "./Icon";
import { Segmented } from "./Segmented";

// Heatmap geometry, in SVG units.
const W = 712;
const LABEL_W = 116;
const GRID_X = LABEL_W + 8;
const GRID_W = W - GRID_X;
const GAP = 2;
const ROW_H = 9;
const ROW_STEP = ROW_H + GAP;
const GROUP_GAP = 6;
const LANE_STEP = 10;
const LAYERS: LayerId[] = ["Consumers", "Credit", "Markets"];

// Advances the playhead by wall-clock time, so a throttled or slow frame rate doesn't slow playback.
function usePlayback() {
  const isPlaying = useAppStore((s) => s.isPlaying);
  const playIntervalMs = useAppStore((s) => s.playIntervalMs);
  useEffect(() => {
    if (!isPlaying) return;
    const from = useAppStore.getState().tFloat;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const st = useAppStore.getState();
      const max = (st.result?.steps ?? st.steps) - 1;
      const next = from + (now - start) / playIntervalMs;
      if (next >= max) {
        st.setPlayhead(max);
        st.setIsPlaying(false);
        return;
      }
      st.setPlayhead(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, playIntervalMs]);
}

export function TimelinePanel() {
  usePlayback();
  const result = useAppStore((s) => s.result);
  const events = useAppStore((s) => s.scenario.events);
  const t = useAppStore((s) => s.t);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const playIntervalMs = useAppStore((s) => s.playIntervalMs);
  const selected = useAppStore((s) => s.selectedNodeId);
  const setT = useAppStore((s) => s.setT);
  const setIsPlaying = useAppStore((s) => s.setIsPlaying);
  const setPlayIntervalMs = useAppStore((s) => s.setPlayIntervalMs);
  const setSelected = useAppStore((s) => s.setSelectedNodeId);

  const months = result?.steps ?? 0;
  const maxT = Math.max(0, months - 1);
  const cellW = months > 0 ? (GRID_W - (months - 1) * GAP) / months : 0;
  const colX = (m: number) => GRID_X + m * (cellW + GAP);

  const lanes = events.filter((e) => e.durationSteps > 0);
  const lanesH = lanes.length > 0 ? lanes.length * LANE_STEP + 6 : 0;

  // Rows grouped by layer, in the order stress usually travels.
  const rows = useMemo(() => {
    const out: Array<{ id: NodeId; label: string; y: number }> = [];
    let y = lanesH;
    LAYERS.forEach((layer, li) => {
      if (li > 0) y += GROUP_GAP;
      for (const n of NODES.filter((n) => n.layer === layer)) {
        out.push({ id: n.id, label: n.label, y });
        y += ROW_STEP;
      }
    });
    return out;
  }, [lanesH]);
  const gridBottom = rows[rows.length - 1].y + ROW_H;
  const height = gridBottom + 18;

  // The cells only change with the run, not with the playhead.
  const cells = useMemo(() => {
    if (!result) return null;
    return rows.map((r) =>
      result.seriesByNode[r.id].map((v, m) => (
        <rect
          key={`${r.id}_${m}`}
          x={GRID_X + m * (cellW + GAP)}
          y={r.y}
          width={cellW}
          height={ROW_H}
          rx={1.5}
          fill={stressColor(v)}
          onClick={() => {
            setT(m);
            setSelected(r.id);
          }}
        >
          <title>{`${r.label} · month ${m} · ${v.toFixed(3)}`}</title>
        </rect>
      ))
    );
  }, [result, rows, cellW, setT, setSelected]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = rows.findIndex((r) => r.id === selected);
    const keys: Record<string, () => void> = {
      ArrowLeft: () => setT(t - 1),
      ArrowRight: () => setT(t + 1),
      Home: () => setT(0),
      End: () => setT(maxT),
      ArrowUp: () => setSelected(rows[Math.max(0, i - 1)].id),
      ArrowDown: () => setSelected(rows[Math.min(rows.length - 1, i + 1)].id),
    };
    if (keys[e.key]) {
      e.preventDefault();
      setIsPlaying(false);
      keys[e.key]();
    }
  };

  const ticks = [0, months / 4, months / 2, (3 * months) / 4].map(Math.round).concat(maxT);

  return (
    <section className="timeline" aria-label="Timeline">
      <div className="playback">
        <button
          type="button"
          className="playButton"
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={!result}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <Icon name={isPlaying ? "pause" : "play"} size={14} />
        </button>
        <button type="button" className="iconButton bordered" onClick={() => setT(t - 1)} aria-label="Previous month">
          <Icon name="chevron-left" size={15} />
        </button>
        <button type="button" className="iconButton bordered" onClick={() => setT(t + 1)} aria-label="Next month">
          <Icon name="chevron-right" size={15} />
        </button>
        <span className="monthReadout">
          m{t} <span className="muted">/ {maxT}</span>
        </span>
        <span className="spacer" />
        <span className="hint">click a month to jump · a row to inspect</span>
        <Segmented<number>
          label="Playback speed"
          size="sm"
          value={playIntervalMs}
          onChange={setPlayIntervalMs}
          options={SPEEDS.map((s) => ({ value: s.ms, label: s.label }))}
        />
      </div>

      <div
        className="heatmap"
        tabIndex={0}
        role="slider"
        aria-label="Month. Up and down arrows choose a node."
        aria-valuemin={0}
        aria-valuemax={maxT}
        aria-valuenow={t}
        aria-valuetext={`Month ${t}`}
        onKeyDown={onKeyDown}
      >
        <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMinYMin meet">
          {lanes.map((ev, i) => (
            <g key={ev.id}>
              <text x={LABEL_W} y={i * LANE_STEP + 7} className="laneLabel">
                {eventName(ev.type).toLowerCase()}
              </text>
              <rect
                x={colX(Math.min(ev.startStep, months))}
                y={i * LANE_STEP + 3}
                width={Math.max(0, colX(Math.min(months, ev.startStep + ev.durationSteps)) - colX(ev.startStep) - GAP)}
                height={4}
                rx={2}
                fill={EVENT_COLORS[ev.type]}
              />
            </g>
          ))}
          {rows.map((r) => (
            <text
              key={r.id}
              x={LABEL_W}
              y={r.y + ROW_H - 1}
              className={r.id === selected ? "rowLabel selected" : "rowLabel"}
              onClick={() => setSelected(r.id)}
            >
              {r.label}
            </text>
          ))}
          {cells}
          {months > 0 && (
            <rect
              className="playheadColumn"
              x={colX(t) - 2}
              y={lanes.length > 0 ? -1 : rows[0].y - 3}
              width={cellW + 4}
              height={gridBottom + 3 - (lanes.length > 0 ? -1 : rows[0].y - 3)}
              rx={3}
            />
          )}
          {months > 0 &&
            ticks.map((m) => (
              <text key={m} x={colX(m) + cellW / 2} y={height - 3} className={m === t ? "tick on" : "tick"}>
                m{m}
              </text>
            ))}
        </svg>
      </div>
    </section>
  );
}
