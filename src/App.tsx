import { useEffect, useRef } from "react";
import { Inspector } from "./components/Inspector";
import { NetworkView } from "./components/NetworkView";
import { ScenarioRail } from "./components/ScenarioRail";
import { StageHeader } from "./components/StageHeader";
import { TimelinePanel } from "./components/TimelinePanel";
import { TopBar } from "./components/TopBar";
import { useAppStore } from "./state/store";

export function App() {
  const result = useAppStore((s) => s.result);
  const started = useRef(false);

  useEffect(() => {
    void useAppStore.getState().runSimulation();
  }, []);

  // Play the first run through once, unless the visitor prefers reduced motion; then
  // open on a month where the cascade is well under way.
  useEffect(() => {
    if (!result || started.current) return;
    started.current = true;
    const st = useAppStore.getState();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) st.setT(Math.min(12, result.steps - 1));
    else st.setIsPlaying(true);
  }, [result]);

  return (
    <div className="app">
      <TopBar />
      <div className="workspace">
        <aside className="rail" aria-label="Scenario">
          <ScenarioRail />
        </aside>
        <main className="stage">
          <StageHeader />
          <NetworkView />
          <TimelinePanel />
        </main>
        <aside className="inspector" aria-label="Selected node">
          <Inspector />
        </aside>
      </div>
    </div>
  );
}
