import { describeMonth } from "../sim/story";
import { useAppStore } from "../state/store";
import { stressGradientCss } from "../ui/colors";

const LEGEND = stressGradientCss();

export function StageHeader() {
  const result = useAppStore((s) => s.result);
  const scenario = useAppStore((s) => s.scenario);
  const t = useAppStore((s) => s.t);

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
      <div className="legend" aria-hidden="true">
        <span className="eyebrow">Stress</span>
        <span className="legendRamp" style={{ background: LEGEND }} />
        <span className="legendTicks">
          <span>0 calm</span>
          <span>0.5</span>
          <span>1 severe</span>
        </span>
      </div>
    </header>
  );
}
