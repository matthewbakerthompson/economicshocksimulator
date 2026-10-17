import { useEffect, useRef, useState } from "react";
import { PRESETS } from "../sim/presets";
import { encodeShareHash } from "../state/shareLink";
import { useAppStore } from "../state/store";
import { Icon } from "./Icon";

const REPO_URL = "https://github.com/matthewbakerthompson/economicshocksimulator";

type CopyState = "idle" | "copied" | "failed";

// For browsers or embeds that block the async clipboard API.
function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

function CopyLinkButton() {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    const s = useAppStore.getState();
    const hash = encodeShareHash({ scenario: s.scenario, steps: s.steps, t: s.t, selectedNodeId: s.selectedNodeId });
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState(legacyCopy(url) ? "copied" : "failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2500);
  };

  return (
    <>
      <button type="button" className="topLink" onClick={() => void copy()}>
        <Icon name={state === "copied" ? "check" : "link"} />
        <span>{state === "copied" ? "Link copied" : state === "failed" ? "Copy failed" : "Copy link"}</span>
      </button>
      <span className="srOnly" role="status">
        {state === "copied"
          ? "A link to this scenario is on your clipboard."
          : state === "failed"
            ? "Couldn't copy. The address bar has the same link."
            : ""}
      </span>
    </>
  );
}

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
          <select aria-label="Preset scenario" value={presetId} onChange={(e) => applyPreset(e.target.value)}>
            {presetId === "custom" && <option value="custom">Custom scenario</option>}
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" />
        </label>
        <CopyLinkButton />
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
