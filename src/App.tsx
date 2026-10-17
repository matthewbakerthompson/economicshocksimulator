import { useEffect } from "react";
import { ExploreMode } from "./components/ExploreMode";
import { StoryMode } from "./components/StoryMode";
import { TopBar } from "./components/TopBar";
import { usePlayback } from "./hooks/usePlayback";
import { decodeShareHash, encodeShareHash } from "./state/shareLink";
import { useAppStore } from "./state/store";

/** Keeps the URL hash in step with the scenario, and applies a link pasted into the address bar. */
function useShareableUrl() {
  useEffect(() => {
    const current = () => {
      const s = useAppStore.getState();
      return { mode: s.mode, scenario: s.scenario, steps: s.steps, t: s.t, selectedNodeId: s.selectedNodeId };
    };
    const write = () => {
      const hash = encodeShareHash(current());
      if (hash !== window.location.hash) window.history.replaceState(null, "", hash);
    };
    const onHashChange = () => {
      const link = decodeShareHash(window.location.hash, current());
      if (link) useAppStore.getState().applyLink(link);
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
  const mode = useAppStore((s) => s.mode);
  const presetId = useAppStore((s) => s.presetId);
  usePlayback();
  useShareableUrl();

  useEffect(() => {
    void useAppStore.getState().runSimulation();
  }, []);

  return (
    <div className="app">
      <TopBar />
      {/* A new preset is a new story, so it starts from its first chapter. */}
      {mode === "story" ? <StoryMode key={presetId} /> : <ExploreMode />}
    </div>
  );
}
