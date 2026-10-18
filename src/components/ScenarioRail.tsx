import { useEffect, useRef, useState } from "react";
import { dampeningStrength } from "../sim/engine";
import { eventName } from "../sim/story";
import type { BufferPreset, CausalEvent, EventType, LagPreset } from "../sim/types";
import { HORIZONS, useAppStore } from "../state/store";
import { Icon } from "./Icon";
import { Segmented } from "./Segmented";

const EVENT_TYPES: Array<{ type: EventType; blurb: string }> = [
  { type: "unemployment", blurb: "Unemployment rises by the size you set, spread over the months it lasts." },
  { type: "stagflation", blurb: "Prices rise while growth stalls. Cuts confidence and spending, and raises borrowing costs and risk aversion." },
  { type: "oil_glut", blurb: "Cheap oil lowers borrowing costs and eases volatility and funding strain." },
];

const MAGNITUDE: Record<EventType, { max: number; step: number; initial: number }> = {
  unemployment: { max: 6, step: 0.1, initial: 1 },
  stagflation: { max: 1, step: 0.05, initial: 0.6 },
  oil_glut: { max: 1, step: 0.05, initial: 0.6 },
};

function size(ev: CausalEvent): string {
  return ev.type === "unemployment" ? `up ${ev.magnitude.toFixed(1)} points` : `severity ${ev.magnitude.toFixed(2)}`;
}

function months(ev: CausalEvent): string {
  const end = ev.startStep + ev.durationSteps - 1;
  return end > ev.startStep ? `months ${ev.startStep} to ${end}` : `month ${ev.startStep}`;
}

let nextId = 0;

export function ScenarioRail() {
  const scenario = useAppStore((s) => s.scenario);
  const steps = useAppStore((s) => s.steps);
  const t = useAppStore((s) => s.t);
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
    // A new shock starts where you're looking, so its effect shows up straight away.
    const start = Math.max(0, Math.min(t, steps - 2));
    const ev: CausalEvent = {
      id: `ev_${type}_${nextId++}`,
      type,
      magnitude: MAGNITUDE[type].initial,
      startStep: start,
      durationSteps: Math.min(4, steps - start),
    };
    setScenario({ events: [...events, ev] });
    setSelectedId(ev.id);
    setMenuOpen(false);
  };

  const remove = (id: string) => setScenario({ events: events.filter((e) => e.id !== id) });
  const bufferPct = (p: BufferPreset) => `${(dampeningStrength(p) * 100).toFixed(1).replace(/\.0$/, "")}%`;

  return (
    <div className="railInner">
      <section className="railSection" aria-labelledby="scenario-heading">
        <h2 id="scenario-heading">Your scenario</h2>
        <p className="railIntro">Add shocks and set when they start and how long they last. The model reruns after every change.</p>

        {events.length === 0 ? (
          <p className="empty">No shocks yet. Add one below.</p>
        ) : (
          <ul className="eventList">
            {events.map((ev, i) => {
              const open = ev.id === openId;
              const sameType = events.filter((e) => e.type === ev.type);
              const name =
                sameType.length > 1
                  ? `${eventName(ev.type)} ${events.slice(0, i + 1).filter((e) => e.type === ev.type).length}`
                  : eventName(ev.type);
              const left = Math.min(ev.startStep, steps) / steps;
              const width = Math.max(0, Math.min(ev.durationSteps, steps - ev.startStep)) / steps;
              const m = MAGNITUDE[ev.type];
              return (
                <li key={ev.id} className={open ? "eventItem open" : "eventItem"}>
                  <button
                    type="button"
                    className="eventHead"
                    aria-expanded={open}
                    onClick={() => setSelectedId(open ? null : ev.id)}
                  >
                    <span className="eventName">{name}</span>
                    <span className="eventMeta">
                      {size(ev)}, {months(ev)}
                    </span>
                    <Icon name={open ? "chevron-down" : "chevron-right"} size={15} />
                  </button>
                  <div className="eventTrack" aria-hidden="true">
                    <span style={{ left: `${left * 100}%`, width: `${width * 100}%` }} />
                  </div>
                  {open && (
                    <div className="eventEditor">
                      <label className="field">
                        <span className="fieldRow">
                          <span>{ev.type === "unemployment" ? "Total rise, in percentage points" : "Severity, 0 to 1"}</span>
                          <span className="fieldValue">
                            {ev.type === "unemployment" ? ev.magnitude.toFixed(1) : ev.magnitude.toFixed(2)}
                          </span>
                        </span>
                        <input
                          type="range"
                          aria-label={
                            ev.type === "unemployment" ? `${name} total rise, percentage points` : `${name} severity, 0 to 1`
                          }
                          aria-valuetext={size(ev)}
                          min={0}
                          max={m.max}
                          step={m.step}
                          value={ev.magnitude}
                          onChange={(e) => update(ev.id, { magnitude: parseFloat(e.target.value) })}
                        />
                      </label>
                      <div className="steppers">
                        <Stepper
                          label="Starts in month"
                          value={String(ev.startStep)}
                          onDec={() => update(ev.id, { startStep: Math.max(0, ev.startStep - 1) })}
                          onInc={() => {
                            const startStep = Math.min(steps - 1, ev.startStep + 1);
                            update(ev.id, { startStep, durationSteps: Math.min(ev.durationSteps, steps - startStep) });
                          }}
                          decLabel="Start a month earlier"
                          incLabel="Start a month later"
                        />
                        <Stepper
                          label="Lasts, in months"
                          value={String(ev.durationSteps)}
                          onDec={() => update(ev.id, { durationSteps: Math.max(1, ev.durationSteps - 1) })}
                          onInc={() =>
                            update(ev.id, { durationSteps: Math.min(steps - ev.startStep, ev.durationSteps + 1) })
                          }
                          decLabel="One month shorter"
                          incLabel="One month longer"
                        />
                      </div>
                      <button type="button" className="textButton" onClick={() => remove(ev.id)}>
                        <Icon name="trash" size={14} />
                        Remove this shock
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="menuAnchor" ref={menuRef}>
          <button
            type="button"
            className="secondary addShock"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name="plus" size={15} />
            Add a shock
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              {EVENT_TYPES.map(({ type, blurb }) => (
                <button key={type} type="button" role="menuitem" className="menuItem" onClick={() => add(type)}>
                  <span className="menuItemTitle">{eventName(type)}</span>
                  <span className="menuItemBlurb">{blurb}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <details className="assumptions">
        <summary>Model assumptions</summary>
        <div className="control">
          <span className="controlLabel">
            Lags
            <span className="controlHelp">How long stress takes to travel along each channel.</span>
          </span>
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
          <span className="controlLabel">
            Buffers
            <span className="controlHelp">
              How much stress each part absorbs a month: {bufferPct("low")}, {bufferPct("medium")} or{" "}
              {bufferPct("high")}.
            </span>
          </span>
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
          <span className="controlLabel">
            Horizon
            <span className="controlHelp">How many months to run.</span>
          </span>
          <Segmented<number>
            label="Horizon"
            value={steps}
            onChange={setSteps}
            options={HORIZONS.map((h) => ({ value: h, label: `${h} months` }))}
          />
        </div>
      </details>

      <p className="railNote">
        Stress on each part of the economy runs from 0 (none) to 1 (the most the model allows). Each channel passes on a
        share of the new stress its source took on, after its lag.
      </p>
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
      <span className="stepperLabel">{props.label}</span>
      <div className="stepperBox">
        <button type="button" className="stepperButton" onClick={props.onDec} aria-label={props.decLabel}>
          <Icon name="minus" size={15} />
        </button>
        <output className="stepperValue" aria-live="polite">
          {props.value}
        </output>
        <button type="button" className="stepperButton" onClick={props.onInc} aria-label={props.incLabel}>
          <Icon name="plus" size={15} />
        </button>
      </div>
    </div>
  );
}
