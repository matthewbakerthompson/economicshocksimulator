import { useMemo, useState } from "react";
import { type Chapter, buildNarrative } from "../sim/narrative";
import { useAppStore } from "../state/store";
import { Icon } from "./Icon";
import { LayerBands } from "./LayerBands";

/** The chapter the playhead is in: the last one that has started. */
function chapterAt(chapters: Chapter[], t: number): number {
  let index = 0;
  chapters.forEach((c, i) => {
    if (c.from <= t) index = i;
  });
  return index;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The run told as a guided story: the finding, the chart, and one chapter at a time. */
export function StoryMode() {
  const result = useAppStore((s) => s.result);
  const error = useAppStore((s) => s.error);
  const scenario = useAppStore((s) => s.scenario);
  const t = useAppStore((s) => s.t);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const play = useAppStore((s) => s.play);
  const pause = useAppStore((s) => s.pause);
  const setT = useAppStore((s) => s.setT);
  const setMode = useAppStore((s) => s.setMode);
  // A link into the story (a month past 0) opens straight on that chapter.
  const [started, setStarted] = useState(() => useAppStore.getState().t > 0);

  const narrative = useMemo(() => (result ? buildNarrative(result, scenario) : null), [result, scenario]);

  if (error) {
    return (
      <section className="story">
        <p className="notice" role="alert">
          The model didn't run: {error}. Reload the page to try again.
        </p>
      </section>
    );
  }
  if (!narrative || !result) {
    return (
      <section className="story" aria-busy="true">
        <p className="notice">Running the model…</p>
      </section>
    );
  }

  const { chapters } = narrative;
  const last = result.steps - 1;
  const index = chapterAt(chapters, t);
  const chapter = chapters[index];
  const finished = started && !isPlaying && t >= last && index === chapters.length - 1;
  // The layer whose peak this chapter's peak follows, for the lag arrow.
  const lagFrom = chapter.layer
    ? (chapters
        .slice(0, index)
        .reverse()
        .find((c) => c.layer)?.layer ?? null)
    : null;

  const goTo = (i: number) => {
    const c = chapters[Math.max(0, Math.min(chapters.length - 1, i))];
    setStarted(true);
    if (reducedMotion()) setT(c.to);
    else play({ from: c.from, to: c.to });
  };
  const togglePlay = () => {
    if (isPlaying) return pause();
    if (!started) return goTo(0);
    play({ from: t >= chapter.to ? chapter.from : t, to: chapter.to });
  };
  const atChapterEnd = !isPlaying && t >= chapter.to;

  return (
    <section className="story" aria-labelledby="finding">
      <header className="finding">
        <h1 id="finding">{narrative.title}</h1>
        <p className="dek">{narrative.dek}</p>
        {!started && (
          <div className="storyStart">
            <button type="button" className="primary" onClick={() => goTo(0)}>
              <Icon name="play" size={14} />
              Play the story
            </button>
            <span className="storyLength">
              {chapters.length} chapters, about {Math.round((last + 1) * 0.9)} seconds
            </span>
            <button type="button" className="textButton exploreLink" onClick={() => setMode("explore")}>
              Or explore it yourself
              <Icon name="arrow-right" size={14} />
            </button>
          </div>
        )}
      </header>

      <LayerBands
        mode="story"
        focus={chapter.layer ?? null}
        range={started ? [chapter.from, chapter.to] : null}
        lagFrom={lagFrom}
      />

      <div className="chapterPanel">
        <ol className="chapterSteps" aria-label="Chapters">
          {chapters.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className={
                  i === index && started ? "step current" : i < index && started ? "step done" : "step"
                }
                aria-current={i === index && started ? "step" : undefined}
                onClick={() => goTo(i)}
              >
                <span className="stepBar" aria-hidden="true" />
                <span className="stepTitle">{c.title}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="chapterText" aria-live="polite">
          {!started ? (
            <>
              <p className="chapterCount">First chapter</p>
              <h2>{chapters[0].title}</h2>
              <p>{chapters[0].body}</p>
            </>
          ) : finished ? (
            <>
              <p className="chapterCount">The end</p>
              <h2>That's the story</h2>
              <p>
                Every number above comes from the model's receipts. Explore it yourself to change the shocks,
                follow any part of the economy, or see exactly why each one moved.
              </p>
            </>
          ) : (
            <>
              <p className="chapterCount">
                Chapter {index + 1} of {chapters.length}
              </p>
              <h2>{chapter.title}</h2>
              <p>{chapter.body}</p>
            </>
          )}
        </div>

        <div className="chapterControls">
          {!started ? null : finished ? (
            <>
              <button type="button" className="primary" onClick={() => setMode("explore")}>
                Explore it yourself
                <Icon name="arrow-right" size={15} />
              </button>
              <button type="button" className="secondary" onClick={() => goTo(0)}>
                <Icon name="restart" size={14} />
                Replay the story
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="secondary"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
              >
                <Icon name="chevron-left" size={15} />
                Back
              </button>
              <button
                type="button"
                className="secondary"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play this chapter"}
              >
                <Icon name={isPlaying ? "pause" : "play"} size={13} />
                {isPlaying ? "Pause" : atChapterEnd ? "Replay chapter" : "Play"}
              </button>
              {index < chapters.length - 1 && (
                <button
                  type="button"
                  className={atChapterEnd ? "primary" : "secondary"}
                  onClick={() => goTo(index + 1)}
                >
                  Next
                  <Icon name="chevron-right" size={15} />
                </button>
              )}
              <button type="button" className="textButton" onClick={() => goTo(0)}>
                <Icon name="restart" size={14} />
                Restart
              </button>
            </>
          )}
          {started && !finished && (
            <button type="button" className="textButton exploreLink" onClick={() => setMode("explore")}>
              Explore it yourself
              <Icon name="arrow-right" size={14} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
