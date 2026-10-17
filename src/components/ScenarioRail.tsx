import { useEffect, useRef, useState } from "react";
import { dampeningStrength } from "../sim/engine";
import { eventName } from "../sim/story";
import type { BufferPreset, CausalEvent, EventType, LagPreset } from "../sim/types";
import { HORIZONS, useAppStore } from "../state/store";
import { EVENT_COLORS } from "../ui/colors";
import { Icon } from "./Icon";
import { Segmented } from "./Segmented";

const EVENT_TYPES: Array<{ type: EventType; blurb: string }> = [
  { type: "unemployment", blurb: "Joblessness rises by a number of percentage points." },
  { type: "stagflation", blurb: "Prices rise while growth stalls; stress lingers and spreads harder." },
  { type: "oil_glut", blurb: "Cheap oil eases borrowing costs, volatility and liquidity." },
];

const MAGNITUDE: Record<EventType, { max: number; step: number; initial: number; unit: string }> = {
  unemployment: { max: 6, step: 0.1, initial: 1, unit: "pp" },
  stagflation: { max: 1, step: 0.05, initial: 0.6, unit: "severity" },
  oil_glut: { max: 1, step: 0.05, initial: 0.6, unit: "severity" },
};

function magnitudeText(ev: CausalEvent): string {
  return ev.type === "unemployment" ? `+${ev.magnitude.toFixed(1)} pp` : `sev ${ev.magnitude.toFixed(2)}`;
}

function windowText(ev: CausalEvent): string {
  const end = ev.startStep + ev.durationSteps - 1;
  return end > ev.startStep ? `m${ev.startStep}–${end}` : `m${ev.startStep}`;
}

function describeWindow(ev: CausalEvent): string {
  const size =
    ev.type === "unemployment" ? `${ev.magnitude.toFixed(1)} percentage points` : `severity ${ev.magnitude.toFixed(2)}`;
  const end = ev.startStep + ev.durationSteps - 1;
  return `${size}, ${end > ev.startStep ? `months ${ev.startStep} to ${end}` : `month ${ev.startStep}`}`;
}

function ticks(steps: number): number[] {
  return [0, steps / 4, steps / 2, (3 * steps) / 4].map(Math.round).concat(steps - 1);
}

let nextId = 0;

export function ScenarioRail() {
  const scenario = useAppStore((s) => s.scenario);
  const steps = useAppStore((s) => s.steps);
  const setScenario = useAppStore((s) => s.setScenario);
  const setSteps = useAppStore((s) => s.setSteps);
  const events = scenario.events;

  const [selectedId, setSelectedId] = useState<string | null>(events[events.length - 1]?.id ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // null means every event is collapsed. If the open event is gone (a preset swapped the
  // events out), open the last one instead.
  const openId =
    selectedId === null || events.some((e) => e.id === selectedId)
      ? selectedId
      : (events[events.length - 1]?.id ?? null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  const update = (id: string, patch: Partial<CausalEvent>) =>
    setScenario({ events: events.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const add = (type: EventType) => {
    const ev: CausalEvent = {
      id: `ev_${type}_${nextId++}`,
      type,
      magnitude: MAGNITUDE[type].initial,
      startStep: 1,
      durationSteps: Math.min(4, steps - 1),
    };
    setScenario({ events: [...events, ev] });
    setSelectedId(ev.id);
    setMenuOpen(false);
  };

  const remove = (id: string) => setScenario({ events: events.filter((e) => e.id !== id) });

  const bufferPct = `${(dampeningStrength(scenario.bufferPreset) * 100).toFixed(1).replace(/\.0$/, "")}%`;

  return (
    <div className="railInner">
      <section className="railSection" aria-labelledby="events-heading">
        <div className="sectionHead">
          <h2 id="events-heading" className="sectionTitle">
            Events <span className="sectionCount">{events.length} stacked</span>
          </h2>
          <div className="menuAnchor" ref={menuRef}>
            <button
              type="button"
              className="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <Icon name="plus" size={14} />
              Add event
            </button>
            {menuOpen && (
              <div className="menu" role="menu">
                {EVENT_TYPES.map(({ type, blurb }) => (
                  <button key={type} type="button" role="menuitem" className="menuItem" onClick={() => add(type)}>
                    <span className="dot" style={{ background: EVENT_COLORS[type] }} />
                    <span>
                      <span className="menuItemTitle">{eventName(type)}</span>
                      <span className="menuItemBlurb">{blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <p className="empty">No events yet. Add one to shock the system, or pick a preset at the top.</p>
        ) : (
          <>
            <div className="monthTicks" aria-hidden="true">
              {ticks(steps).map((m) => (
                <span key={m}>m{m}</span>
              ))}
            </div>
            <ul className="eventList">
              {events.map((ev) => {
                const open = ev.id === openId;
                const color = EVENT_COLORS[ev.type];
                const left = Math.min(ev.startStep, steps) / steps;
                const width = Math.max(0, Math.min(ev.durationSteps, steps - ev.startStep)) / steps;
                const m = MAGNITUDE[ev.type];
                return (
                  <li key={ev.id} className={open ? "eventCard open" : "eventCard"}>
                    <button
                      type="button"
                      className="eventHead"
                      aria-expanded={open}
                      aria-label={`${eventName(ev.type)}, ${describeWindow(ev)}`}
                      onClick={() => setSelectedId(open ? null : ev.id)}
                    >
                      <span className="dot" style={{ background: color }} />
                      <span className="eventName">{eventName(ev.type)}</span>
                      <span className="eventMeta">
                        {magnitudeText(ev)} · {windowText(ev)}
                      </span>
                    </button>
                    <div className="eventTrack" aria-hidden="true">
                      <span style={{ left: `${left * 100}%`, width: `${width * 100}%`, background: color }} />
                    </div>
                    {open && (
                      <div className="eventEditor">
                        <label className="field">
                          <span className="fieldRow">
                            <span className="fieldLabel">Magnitude</span>
                            <span className="fieldValue">
                              {ev.type === "unemployment" ? `+${ev.magnitude.toFixed(1)} pp` : ev.magnitude.toFixed(2)}{" "}
                              <span className="muted">of {m.max}</span>
                            </span>
                          </span>
                          <input
                            type="range"
                            aria-label={
                              ev.type === "unemployment"
                                ? `${eventName(ev.type)} magnitude, percentage points`
                                : `${eventName(ev.type)} severity, 0 to 1`
                            }
                            aria-valuetext={
                              ev.type === "unemployment"
                                ? `${ev.magnitude.toFixed(1)} percentage points`
                                : `severity ${ev.magnitude.toFixed(2)}`
                            }
                            min={0}
                            max={m.max}
                            step={m.step}
                            value={ev.magnitude}
                            style={{ accentColor: color }}
                            onChange={(e) => update(ev.id, { magnitude: parseFloat(e.target.value) })}
                          />
                        </label>
                        <div className="steppers">
                          <Stepper
                            label="Start"
                            value={`m${ev.startStep}`}
                            onDec={() => update(ev.id, { startStep: Math.max(0, ev.startStep - 1) })}
                            onInc={() => {
                              const startStep = Math.min(steps - 1, ev.startStep + 1);
                              update(ev.id, { startStep, durationSteps: Math.min(ev.durationSteps, steps - startStep) });
                            }}
                            decLabel="Start a month earlier"
                            incLabel="Start a month later"
                          />
                          <Stepper
                            label="Duration"
                            value={`${ev.durationSteps} mo`}
                            onDec={() => update(ev.id, { durationSteps: Math.max(1, ev.durationSteps - 1) })}
                            onInc={() =>
                              update(ev.id, { durationSteps: Math.min(steps - ev.startStep, ev.durationSteps + 1) })
                            }
                            decLabel="One month shorter"
                            incLabel="One month longer"
                          />
                        </div>
                        <button type="button" className="textButton" onClick={() => remove(ev.id)}>
                          <Icon name="trash" size={13} />
                          Remove event
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="railSection" aria-labelledby="assumptions-heading">
        <h2 id="assumptions-heading" className="sectionTitle">
          Assumptions
        </h2>
        <div className="control">
          <span className="fieldLabel">Lags</span>
          <Segmented<LagPreset>
            label="Lags"
            value={scenario.lagPreset}
            onChange={(lagPreset) => setScenario({ lagPreset })}
            options={[
              { value: "short", label: "Short" },
              { value: "medium", label: "Medium" },
              { value: "long", label: "Long" },
            ]}
          />
        </div>
        <div className="control">
          <span className="fieldLabel">Buffers</span>
          <Segmented<BufferPreset>
            label="Buffers"
            value={scenario.bufferPreset}
            onChange={(bufferPreset) => setScenario({ bufferPreset })}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
        </div>
        <div className="control">
          <span className="fieldLabel">Horizon</span>
          <Segmented<number>
            label="Horizon"
            value={steps}
            onChange={setSteps}
            options={HORIZONS.map((h) => ({ value: h, label: `${h} mo` }))}
          />
        </div>
      </section>

      <section className="railNote" aria-label="How to read it">
        <p className="eyebrow">How to read it</p>
        <p>
          Stress is a 0–1 pressure index. Each channel passes on a share of the new stress its source took on, after
          its lag. Buffers absorb {bufferPct} of each node's stress a month.
        </p>
      </section>
    </div>
  );
}

function Stepper(props: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  decLabel: string;
  incLabel: string;
}) {
  return (
    <div className="stepper">
      <span className="fieldLabel">{props.label}</span>
      <div className="stepperBox">
        <button type="button" className="stepperButton" onClick={props.onDec} aria-label={props.decLabel}>
          <Icon name="minus" size={14} />
        </button>
        <output className="stepperValue" aria-live="polite">
          {props.value}
        </output>
        <button type="button" className="stepperButton" onClick={props.onInc} aria-label={props.incLabel}>
          <Icon name="plus" size={14} />
        </button>
      </div>
    </div>
  );
}
