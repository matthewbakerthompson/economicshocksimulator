import { describeMonth } from "../sim/story";
import { type StageView, useAppStore } from "../state/store";
import { LEGEND_TICKS, stressGradientCss, stressPosition } from "../ui/colors";
import { Segmented } from "./Segmented";

const LEGEND = stressGradientCss();

const VIEWS: Array<{ value: StageView; label: string }> = [
  { value: "network", label: "Network" },
  { value: "table", label: "Table" },
  { value: "story", label: "Story" },
];

export function StageHeader() {
  const result = useAppStore((s) => s.result);
  const scenario = useAppStore((s) => s.scenario);
  const t = useAppStore((s) => s.t);
  const view = useAppStore((s) => s.stageView);
  const setView = useAppStore((s) => s.setStageView);

  const story = result ? describeMonth(result, scenario, t) : null;
  const active = story?.activeEvents.length ?? 0;

  return (
    <header className="stageHeader">
      <div className="monthStory" aria-live="polite">
        <div className="monthEyebrow">
          <span className="monthLabel">
            Month {t} / {Math.max(0, (result?.steps ?? 1) - 1)}
          </span>
          <span className="chip">
            {active === 0 ? "no events active" : `${active} event${active > 1 ? "s" : ""} active`}
          </span>
        </div>
        <h2 className="headline">{story?.headline ?? "Running the model…"}</h2>
        <p className="detail">{story?.detail ?? " "}</p>
      </div>
      <div className="stageTools">
        <Segmented<StageView> label="View" size="sm" value={view} onChange={setView} options={VIEWS} />
        <figure className="legend">
          <figcaption className="eyebrow">Stress, √ scale</figcaption>
          <span className="legendRamp" style={{ background: LEGEND }} />
          <span className="legendTicks">
            {LEGEND_TICKS.map((v) => (
              <span key={v} style={{ left: `${stressPosition(v) * 100}%` }}>
                {v === 0 ? "0" : v === 1 ? "1" : String(v).replace(/^0/, "")}
              </span>
            ))}
          </span>
        </figure>
      </div>
    </header>
  );
}
