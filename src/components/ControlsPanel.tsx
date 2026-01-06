import { useEffect, useMemo } from "react";
import { useAppStore } from "../state/store";
import type { BufferPreset, CausalEvent, EventType, LagPreset } from "../sim/types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function mkId(type: EventType): string {
  return `ev_${type}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`;
}

function defaultMagnitude(type: EventType): number {
  switch (type) {
    case "unemployment":
      return 1.0;
    case "stagflation":
      return 0.6;
    case "oil_glut":
      return 0.6;
  }
}

function magnitudeLabel(type: EventType): string {
  switch (type) {
    case "unemployment":
      return "Magnitude (pp)";
    case "stagflation":
      return "Severity (0–1)";
    case "oil_glut":
      return "Severity (0–1)";
  }
}

function magnitudeRange(type: EventType): { min: number; max: number; step: number } {
  switch (type) {
    case "unemployment":
      return { min: 0, max: 6, step: 0.1 };
    case "stagflation":
    case "oil_glut":
      return { min: 0, max: 1, step: 0.02 };
  }
}

export function ControlsPanel() {
  const scenario = useAppStore((s) => s.scenario);
  const steps = useAppStore((s) => s.steps);
  const isSimulating = useAppStore((s) => s.isSimulating);
  const runSimulation = useAppStore((s) => s.runSimulation);
  const reset = useAppStore((s) => s.reset);
  const setScenario = useAppStore((s) => s.setScenario);
  const setSteps = useAppStore((s) => s.setSteps);

  // Auto-run once so the canvas is alive immediately.
  useEffect(() => {
    void runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const events = scenario.events;
  const narrativePresets = useMemo(() => {
    const baseline: CausalEvent[] = [
      { id: mkId("unemployment"), type: "unemployment", magnitude: 0, startStep: 1, durationSteps: 0 },
    ];
    const stagflationThenGlut: CausalEvent[] = [
      { id: mkId("stagflation"), type: "stagflation", magnitude: 0.65, startStep: 0, durationSteps: 10 },
      { id: mkId("oil_glut"), type: "oil_glut", magnitude: 0.7, startStep: 3, durationSteps: 5 },
      { id: mkId("unemployment"), type: "unemployment", magnitude: 1.5, startStep: 2, durationSteps: 6 },
    ];
    const oilGlutOnly: CausalEvent[] = [{ id: mkId("oil_glut"), type: "oil_glut", magnitude: 0.8, startStep: 1, durationSteps: 6 }];
    return { baseline, stagflationThenGlut, oilGlutOnly };
  }, []);

  const applyPreset = (name: keyof typeof narrativePresets) => {
    setScenario({ events: narrativePresets[name] });
    void runSimulation();
  };

  const updateEvent = (id: string, patch: Partial<CausalEvent>) => {
    setScenario({
      events: scenario.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  };

  const removeEvent = (id: string) => {
    setScenario({ events: scenario.events.filter((e) => e.id !== id) });
  };

  const addEvent = (type: EventType) => {
    const ev: CausalEvent = {
      id: mkId(type),
      type,
      magnitude: defaultMagnitude(type),
      startStep: 1,
      durationSteps: Math.min(steps, 4),
    };
    setScenario({ events: [...scenario.events, ev] });
  };

  return (
    <div className="stack">
      <div className="kpi">
        <div>
          <strong>Causal events</strong>
          <div className="muted">Stack events; overlaps can interact (story + propagation)</div>
        </div>
        <div className="muted">{events.length} events</div>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <label style={{ margin: 0 }}>Narrative presets</label>
          <div className="row">
            <button className="btn" onClick={() => applyPreset("stagflationThenGlut")}>
              Stagflation + oil glut
            </button>
            <button className="btn" onClick={() => applyPreset("oilGlutOnly")}>
              Oil glut
            </button>
          </div>
        </div>
        <div className="muted">Example combo: oil glut during stagflation → relief is muted + uncertainty can rise.</div>
      </div>

      <div className="row">
        <button className="btn btnPrimary" onClick={() => addEvent("unemployment")}>
          + Unemployment
        </button>
        <button className="btn" onClick={() => addEvent("stagflation")}>
          + Stagflation
        </button>
        <button className="btn" onClick={() => addEvent("oil_glut")}>
          + Oil glut
        </button>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {events.map((ev) => {
          const r = magnitudeRange(ev.type);
          return (
            <div key={ev.id} className="kpi" style={{ gridTemplateColumns: "1fr" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{ev.type}</strong>
                <button className="btn btnDanger" onClick={() => removeEvent(ev.id)}>
                  Remove
                </button>
              </div>

              <div style={{ height: 8 }} />

              <div>
                <label>{magnitudeLabel(ev.type)}</label>
                <div className="row">
                  <input
                    type="range"
                    min={r.min}
                    max={r.max}
                    step={r.step}
                    value={ev.magnitude}
                    onChange={(e) => updateEvent(ev.id, { magnitude: parseFloat(e.target.value) })}
                  />
                  <div style={{ width: 64, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {ev.type === "unemployment" ? ev.magnitude.toFixed(1) : ev.magnitude.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="row">
                <div style={{ flex: 1 }}>
                  <label>Start month</label>
                  <input
                    type="number"
                    min={0}
                    max={steps - 1}
                    value={ev.startStep}
                    onChange={(e) =>
                      updateEvent(ev.id, { startStep: clamp(parseInt(e.target.value || "0", 10), 0, steps - 1) })
                    }
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Duration (months)</label>
                  <input
                    type="number"
                    min={0}
                    max={steps}
                    value={ev.durationSteps}
                    onChange={(e) =>
                      updateEvent(ev.id, { durationSteps: clamp(parseInt(e.target.value || "0", 10), 0, steps) })
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Lag preset</label>
          <select
            value={scenario.lagPreset}
            onChange={(e) => setScenario({ lagPreset: e.target.value as LagPreset })}
            style={{
              width: "100%",
              padding: "10px 10px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(130, 200, 255, 0.18)",
              color: "rgba(235,245,255,0.92)",
            }}
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Buffers preset</label>
          <select
            value={scenario.bufferPreset}
            onChange={(e) => setScenario({ bufferPreset: e.target.value as BufferPreset })}
            style={{
              width: "100%",
              padding: "10px 10px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(130, 200, 255, 0.18)",
              color: "rgba(235,245,255,0.92)",
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Timeline length (months)</label>
          <input
            type="number"
            min={6}
            max={24}
            value={steps}
            onChange={(e) => setSteps(clamp(parseInt(e.target.value || "10", 10), 6, 24))}
          />
        </div>
      </div>

      <div className="row">
        <button className="btn btnPrimary" onClick={() => void runSimulation()} disabled={isSimulating}>
          {isSimulating ? "Simulating…" : "Run"}
        </button>
        <button className="btn btnDanger" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="muted">
        Tip: stack events and overlap them (e.g., stagflation + oil glut) to see interaction notes in the story console.
      </div>
    </div>
  );
}


