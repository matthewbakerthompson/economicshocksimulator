import { useEffect } from "react";
import { useAppStore } from "../state/store";

/**
 * Moves the playhead while playing, by wall-clock time so a throttled frame rate doesn't
 * slow it down, and stops at the end of the current story chapter or of the run.
 */
export function usePlayback() {
  const isPlaying = useAppStore((s) => s.isPlaying);
  const playIntervalMs = useAppStore((s) => s.playIntervalMs);
  useEffect(() => {
    if (!isPlaying) return;
    const from = useAppStore.getState().tFloat;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const st = useAppStore.getState();
      const stop = st.playUntil ?? (st.result?.steps ?? st.steps) - 1;
      const next = from + (now - start) / playIntervalMs;
      if (next >= stop) {
        st.setPlayhead(stop);
        st.pause();
        return;
      }
      st.setPlayhead(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, playIntervalMs]);
}
