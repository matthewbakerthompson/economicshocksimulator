import { useEffect, useRef } from "react";
import { Inspector } from "./components/Inspector";
import { NetworkView } from "./components/NetworkView";
import { ScenarioRail } from "./components/ScenarioRail";
import { StageHeader } from "./components/StageHeader";
import { StoryView } from "./components/StoryView";
import { StressTable } from "./components/StressTable";
import { TimelinePanel } from "./components/TimelinePanel";
import { TopBar } from "./components/TopBar";
import { decodeShareHash, encodeShareHash } from "./state/shareLink";
import { initialLink, useAppStore } from "./state/store";

/** Keeps the URL hash in step with the scenario, and applies a link pasted into the address bar. */
function useShareableUrl() {
  useEffect(() => {
    const write = () => {
      const s = useAppStore.getState();
      const hash = encodeShareHash({ scenario: s.scenario, steps: s.steps, t: s.t, selectedNodeId: s.selectedNodeId });
      if (hash !== window.location.hash) window.history.replaceState(null, "", hash);
    };
    const onHashChange = () => {
      const s = useAppStore.getState();
      const link = decodeShareHash(window.location.hash, {
        scenario: s.scenario,
        steps: s.steps,
        t: s.t,
        selectedNodeId: s.selectedNodeId,
      });
      if (link) s.applyLink(link);
    };
    write();
    const unsubscribe = useAppStore.subscribe(write);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      unsubscribe();
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);
}

export function App() {
  const result = useAppStore((s) => s.result);
  const view = useAppStore((s) => s.stageView);
  const started = useRef(false);
  useShareableUrl();

  useEffect(() => {
    void useAppStore.getState().runSimulation();
  }, []);

  // Play the first run through once, unless the link named a month or the visitor prefers
  // reduced motion; then open on a month where the cascade is well under way.
  useEffect(() => {
    if (!result || started.current) return;
    started.current = true;
    if (initialLink?.hasMonth) return;
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
          <div className="stageBody">
            {view === "network" ? <NetworkView /> : view === "table" ? <StressTable /> : <StoryView />}
          </div>
          <TimelinePanel />
        </main>
        <aside className="inspector" aria-label="Selected node">
          <Inspector />
        </aside>
      </div>
    </div>
  );
}
