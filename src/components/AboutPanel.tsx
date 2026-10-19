import { useEffect, useRef } from "react";
import { dampeningStrength } from "../sim/engine";
import { useAppStore } from "../state/store";
import { HEALTH_CAVEAT, RESEARCH, SOURCES } from "../story/sources";
import { Icon } from "./Icon";

const REPO_URL = "https://github.com/matthewbakerthompson/economicshocksimulator";

const pct = (x: number) => `${(x * 100).toFixed(1).replace(/\.0$/, "")}%`;

/** How the model works and where the numbers about people come from. */
export function AboutPanel() {
  const about = useAppStore((s) => s.about);
  const closeAbout = useAppStore((s) => s.closeAbout);
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (about && !dialog.open) dialog.showModal();
    if (!about && dialog.open) dialog.close();
    if (about) {
      const target = dialog.querySelector(about === "sources" ? "#about-sources" : "#about-top");
      target?.scrollIntoView({ block: "start" });
    }
  }, [about]);

  return (
    <dialog ref={ref} className="about" aria-labelledby="about-top" onClose={closeAbout}>
      <div className="aboutHead">
        <h2 id="about-top">About the model</h2>
        <button type="button" className="iconButton" onClick={closeAbout} aria-label="Close">
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="aboutBody">
        <section>
          <h3>What it is</h3>
          <p>
            The simulator follows stress on 14 parts of the economy in three groups: households, banks and
            credit, and markets. Each part's stress runs from 0 (none) to 1 (the most the model allows). It
            shows how a shock could travel between those parts and how long the effects could last. It is not
            a forecast.
          </p>
        </section>

        <section>
          <h3>How each month works</h3>
          <ul>
            <li>
              Shocks add stress to the parts they hit, or remove it. An unemployment shock is a rise in
              percentage points, spread evenly over the months it lasts. Six points is the top of the scale.
            </li>
            <li>
              Each channel passes on a share of the new stress its source took on, one or two months later.
              The lag setting shortens or lengthens these delays.
            </li>
            <li>
              Buffers absorb part of each part's stress every month: {pct(dampeningStrength("low"))},{" "}
              {pct(dampeningStrength("medium"))} or {pct(dampeningStrength("high"))} for low, medium and high
              buffers. One setting stands in for savings, safety nets and bank capital together.
            </li>
            <li>
              While stagflation lasts, channels pass on 8% more stress and buffers absorb 14% less. During
              stagflation an oil glut's relief is 55% of its usual size, and the mixed signals add some risk
              aversion.
            </li>
            <li>
              Stress can't go below 0 or above 1. When a shock would push past either limit, the receipts in
              Explore show the cut.
            </li>
          </ul>
        </section>

        <section>
          <h3>The written stories</h3>
          <p>
            The stories for "Stagflation meets an oil glut" and "Unemployment shock" describe the run with
            medium lags, medium buffers and 24 months. The text is fixed, and every number in it is computed
            from that run. With any other settings or shocks, the story view shows a short summary of the run
            instead.
          </p>
          <p>
            Feedback is measured by rerunning the scenario without the two channels that close every loop in
            the model: bank losses unsettling investors, and borrowers who cannot refinance missing payments.
          </p>
        </section>

        <section id="about-sources">
          <h3>Numbers about people</h3>
          <p>
            <span className="translated">Tinted numbers</span> turn a model result into people. Only
            unemployment has a real unit in the model. The other two use a scale set by the worst of 2008–10,
            so they show size, not a measurement. Each figure was checked against the publisher's release or
            data file on October 18, 2026.
          </p>
          {Object.values(SOURCES).map((s) => (
            <div key={s.id} className="aboutSource">
              <h4>{s.title}</h4>
              <p>{s.method}</p>
              <p>{s.range}</p>
              <p>{s.caveat}</p>
              <ul className="aboutLinks">
                {s.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section>
          <h3>Health after job loss</h3>
          <p>The stories quote research on health after job loss. The model computes none of it.</p>
          <ul>
            {Object.values(RESEARCH).map((r) => (
              <li key={r.id}>
                {r.finding}{" "}
                <a href={r.href} target="_blank" rel="noreferrer">
                  {r.citation}
                </a>
              </li>
            ))}
          </ul>
          <p>
            {HEALTH_CAVEAT.text}{" "}
            <a href={HEALTH_CAVEAT.link.href} target="_blank" rel="noreferrer">
              {HEALTH_CAVEAT.link.label}
            </a>
          </p>
        </section>

        <section>
          <h3>Limits</h3>
          <ul>
            <li>
              Job losses come only from the unemployment shocks in a scenario. Weak spending and tight credit
              do not cost more jobs in this model.
            </li>
            <li>
              One buffer setting covers the whole economy, so the model can't separate savings, safety nets
              and bank capital.
            </li>
            <li>
              The receipts in Explore attribute each move to its causes under the model's assumptions. They
              are not causal estimates.
            </li>
          </ul>
        </section>

        <p className="aboutFoot">
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            Source code and documentation on GitHub
          </a>
        </p>
      </div>
    </dialog>
  );
}
