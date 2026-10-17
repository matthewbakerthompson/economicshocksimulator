import { PRESETS } from "../sim/presets";
import { useAppStore } from "../state/store";
import { Icon } from "./Icon";

const REPO_URL = "https://github.com/matthewbakerthompson/economicshocksimulator";

export function TopBar() {
  const presetId = useAppStore((s) => s.presetId);
  const applyPreset = useAppStore((s) => s.applyPreset);

  return (
    <header className="topBar">
      <div className="brand">
        <h1 className="brandTitle">Economic Shock Simulator</h1>
        <span className="brandTagline">Directional stress propagation · not a forecast</span>
      </div>
      <div className="topActions">
        <label className="presetSelect">
          <span className="presetLabel">Preset</span>
          <select value={presetId} onChange={(e) => applyPreset(e.target.value)}>
            {presetId === "custom" && <option value="custom">Custom scenario</option>}
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" />
        </label>
        <a className="topLink" href={`${REPO_URL}#propagation-model`} target="_blank" rel="noreferrer">
          <Icon name="book-open" />
          <span>How the model works</span>
        </a>
        <a className="iconButton" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="Source code on GitHub">
          <Icon name="github" size={18} />
        </a>
      </div>
    </header>
  );
}
