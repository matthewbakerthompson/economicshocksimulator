import { ControlsPanel } from "./components/ControlsPanel";
import { ExplainabilityPanel } from "./components/ExplainabilityPanel";
import { GraphView } from "./components/GraphView";
import { Timeline } from "./components/Timeline";
import { useAppStore } from "./state/store";

export function App() {
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);

  return (
    <div className="appShell">
      <div className="panel sideLeft">
        <div className="panelHeader">
          <h2>Scenario</h2>
        </div>
        <div className="panelBody">
          <ControlsPanel />
          <div className="hr" />
          <div className="muted">
            This is <strong>directional stress modeling</strong> under stated assumptions. It is not forecasting.
          </div>
        </div>
      </div>

      <div className="panel graphPanel">
        <div className="graphCanvas">
          <GraphView />
        </div>
      </div>

      <div className="panel timelinePanel">
        <div className="panelBody">
          <Timeline />
        </div>
      </div>

      <div className="panel sideRight">
        <div className="panelHeader">
          <h2>Explainability</h2>
        </div>
        <div className="panelBody">
          <ExplainabilityPanel key={selectedNodeId ?? "none"} />
        </div>
      </div>
    </div>
  );
}



