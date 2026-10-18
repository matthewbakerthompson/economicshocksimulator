import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { buildNarrative } from "../sim/narrative";
import { describeMonth } from "../sim/story";
import type { LayerId } from "../sim/types";
import { type ExploreView, SPEEDS, useAppStore } from "../state/store";
import { Icon } from "./Icon";
import { Inspector } from "./Inspector";
import { LayerBands } from "./LayerBands";
import { NetworkView } from "./NetworkView";
import { ScenarioRail } from "./ScenarioRail";
import { Segmented } from "./Segmented";
import { StressTable } from "./StressTable";

const VIEWS: Array<{ value: ExploreView; label: string }> = [
  { value: "layers", label: "Layers" },
  { value: "map", label: "Map" },
  { value: "table", label: "Table" },
];

function PlaybackBar() {
  const result = useAppStore((s) => s.result);
  const t = useAppStore((s) => s.t);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const play = useAppStore((s) => s.play);
  const pause = useAppStore((s) => s.pause);
  const setT = useAppStore((s) => s.setT);
  const playIntervalMs = useAppStore((s) => s.playIntervalMs);
  const setPlayIntervalMs = useAppStore((s) => s.setPlayIntervalMs);
  const last = Math.max(0, (result?.steps ?? 1) - 1);

  return (
    <div className="playback">
      <button
        type="button"
        className="playButton"
        onClick={() => (isPlaying ? pause() : play())}
        disabled={!result}
        aria-label={isPlaying ? "Pause" : t >= last ? "Play again from month 0" : "Play"}
      >
        <Icon name={isPlaying ? "pause" : "play"} size={14} />
      </button>
      <button type="button" className="iconButton bordered" onClick={() => setT(t - 1)} aria-label="Previous month">
        <Icon name="chevron-left" size={16} />
      </button>
      <button type="button" className="iconButton bordered" onClick={() => setT(t + 1)} aria-label="Next month">
        <Icon name="chevron-right" size={16} />
      </button>
      <button
        type="button"
        className="textButton"
        onClick={() => {
          setT(0);
          play();
        }}
      >
        <Icon name="restart" size={14} />
        Restart
      </button>
      <span className="monthReadout">
        Month <strong>{t}</strong> of {last}
      </span>
      <span className="spacer" />
      <Segmented<number>
        label="Playback speed"
        size="sm"
        value={playIntervalMs}
        onChange={setPlayIntervalMs}
        options={SPEEDS.map((s) => ({ value: s.ms, label: s.label }))}
      />
    </div>
  );
}

/** The full model: change the scenario, scrub through the months, and inspect any part of the economy. */
export function ExploreMode() {
  const result = useAppStore((s) => s.result);
  const error = useAppStore((s) => s.error);
  const scenario = useAppStore((s) => s.scenario);
  const t = useAppStore((s) => s.t);
  const view = useAppStore((s) => s.exploreView);
  const setView = useAppStore((s) => s.setExploreView);
  const [expanded, setExpanded] = useState<LayerId | null>("Consumers");

  const narrative = useMemo(() => (result ? buildNarrative(result, scenario) : null), [result, scenario]);
  const month = result ? describeMonth(result, scenario, t) : null;

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = VIEWS.findIndex((v) => v.value === view);
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = VIEWS[(i + step + VIEWS.length) % VIEWS.length];
    setView(next.value);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-view="${next.value}"]`)?.focus();
  };

  return (
    <div className="explore">
      <aside className="rail" aria-label="Scenario">
        <ScenarioRail />
      </aside>

      <main className="exploreMain">
        <header className="exploreHeader">
          <h1>{narrative?.title ?? "Running the model…"}</h1>
          {error ? (
            <p className="notice" role="alert">
              The model didn't run: {error}.
            </p>
          ) : (
            <p className="monthLine">
              {month ? (
                <>
                  <strong>Month {t}:</strong> {month.headline}. {month.detail}
                </>
              ) : (
                " "
              )}
            </p>
          )}
          <PlaybackBar />
        </header>

        <div className="viewTabs" role="tablist" aria-label="View" onKeyDown={onTabKey}>
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              id={`tab-${v.value}`}
              data-view={v.value}
              aria-selected={view === v.value}
              aria-controls="explore-panel"
              tabIndex={view === v.value ? 0 : -1}
              className={view === v.value ? "viewTab on" : "viewTab"}
              onClick={() => setView(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="exploreBody" id="explore-panel" role="tabpanel" aria-labelledby={`tab-${view}`}>
          {view === "layers" ? (
            <LayerBands
              mode="explore"
              expanded={expanded}
              onToggleLayer={(layer) => setExpanded((e) => (e === layer ? null : layer))}
            />
          ) : view === "map" ? (
            <NetworkView />
          ) : (
            <StressTable />
          )}
          {view === "layers" && (
            <p className="hint">
              Open a layer to see its parts; select one to see why it moved. Drag across the chart, or use the arrow
              keys, to move through the months.
            </p>
          )}
        </div>
      </main>

      <aside className="inspector" aria-label="Why the selected part moved">
        <Inspector />
      </aside>
    </div>
  );
}
