import { useMemo, useState } from "react";
import { summarizeLayers } from "../sim/layers";
import type { NodeId, SimulationResult } from "../sim/types";
import { useAppStore } from "../state/store";
import { STORY_SETTINGS, type RunSummary, type StoryChapter, type WrittenStory, storyFor } from "../story";
import { RESEARCH, SOURCES } from "../story/sources";
import { type Paragraph, sourcesIn } from "../story/text";
import { Icon } from "./Icon";
import { LayerBands } from "./LayerBands";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Story text, with translations into people set apart from the model's own results. */
export function StoryText({ paragraph }: { paragraph: Paragraph }) {
  return (
    <>
      {paragraph.map((s, i) =>
        typeof s === "string" ? (
          s
        ) : (
          <span
            key={i}
            className="translated"
            title={`${SOURCES[s.source].title}: ${SOURCES[s.source].short}`}
          >
            {s.text}
          </span>
        )
      )}
    </>
  );
}

function SourceLine({ paragraphs }: { paragraphs: Paragraph[] }) {
  const openAbout = useAppStore((s) => s.openAbout);
  const ids = sourcesIn(paragraphs);
  if (ids.length === 0) return null;
  return (
    <p className="sourceLine">
      <span>
        <span className="translatedKey" aria-hidden="true" />
        {ids.length === 1 ? "Source" : "Sources"}: {ids.map((id) => SOURCES[id].short).join("; ")}.
      </span>
      <button type="button" className="linkButton" onClick={() => openAbout("sources")}>
        How these numbers are made
      </button>
    </p>
  );
}

/** The run told as a story: a written one for the presets, a short summary for anything else. */
export function StoryMode() {
  const result = useAppStore((s) => s.result);
  const error = useAppStore((s) => s.error);
  const scenario = useAppStore((s) => s.scenario);
  const steps = useAppStore((s) => s.steps);
  const presetId = useAppStore((s) => s.presetId);

  const view = useMemo(() => storyFor(presetId, scenario, steps), [presetId, scenario, steps]);

  if (error) {
    return (
      <section className="story">
        <p className="notice" role="alert">
          The model didn't run: {error}. Reload the page to try again.
        </p>
      </section>
    );
  }
  if (!result || result.steps !== steps) {
    return (
      <section className="story" aria-busy="true">
        <p className="notice">Running the model…</p>
      </section>
    );
  }
  return view.kind === "written" ? <Written story={view} /> : <Summary summary={view} />;
}

/** The highest stress a story's chart has to show, so a small shock still fills its bands. */
function storyScale(result: SimulationResult, nodes: NodeId[], compare: SimulationResult[]): number {
  const layerPeaks = [result, ...compare].flatMap((r) => summarizeLayers(r).map((l) => l.peak));
  const nodePeaks = nodes.map((id) => Math.max(...result.seriesByNode[id]));
  return Math.max(0.02, ...layerPeaks, ...nodePeaks);
}

/** The chapter a story link's month opens on: the first one that covers it. */
function chapterForMonth(chapters: StoryChapter[], t: number): number {
  const i = chapters.findIndex((c) => !c.compare && t >= c.from && t <= c.to);
  return i < 0 ? 0 : i;
}

const still = (c: StoryChapter) => !!c.compare || c.from === c.to;

function Written({ story }: { story: WrittenStory }) {
  const t = useAppStore((s) => s.t);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const play = useAppStore((s) => s.play);
  const pause = useAppStore((s) => s.pause);
  const setT = useAppStore((s) => s.setT);
  const setMode = useAppStore((s) => s.setMode);
  const result = useAppStore((s) => s.result)!;
  const { chapters } = story;
  const scaleMax = useMemo(
    () =>
      storyScale(
        result,
        chapters.flatMap((c) => (c.node ? [c.node] : [])),
        chapters.flatMap((c) => (c.compare ? [c.compare.run] : []))
      ),
    [result, chapters]
  );
  // A link into the story (a month past 0) opens on the chapter that covers that month.
  const [started, setStarted] = useState(() => useAppStore.getState().t > 0);
  const [index, setIndex] = useState(() => chapterForMonth(chapters, useAppStore.getState().t));

  const chapter = chapters[index];
  const last = chapters[chapters.length - 1].to;
  const shown = started ? chapter : chapters[0];
  // Chapters can go back to earlier months; the chart keeps showing everything already told.
  const revealTo = started
    ? Math.max(0, ...chapters.slice(0, index).map((c) => c.to), chapter.compare ? last : 0)
    : 0;
  const finished = started && index === chapters.length - 1 && !isPlaying;
  const atChapterEnd = !isPlaying && t >= chapter.to;
  const seconds = Math.round(chapters.reduce((sum, c) => sum + (still(c) ? 3 : c.to - c.from + 1), 0) * 0.9);

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(chapters.length - 1, i));
    const c = chapters[next];
    setIndex(next);
    setStarted(true);
    if (still(c) || reducedMotion()) setT(c.to);
    else play({ from: c.from, to: c.to });
  };
  const togglePlay = () => {
    if (isPlaying) return pause();
    play({ from: t >= chapter.to || t < chapter.from ? chapter.from : t, to: chapter.to });
  };

  return (
    <section className="story" aria-labelledby="story-headline">
      <header className="finding">
        <h1 id="story-headline">
          <StoryText paragraph={story.headline} />
        </h1>
        <p className="dek">
          <StoryText paragraph={story.dek} />
        </p>
        {!started && (
          <div className="storyStart">
            <button type="button" className="primary" onClick={() => goTo(0)}>
              <Icon name="play" size={14} />
              Play the story
            </button>
            <span className="storyLength">
              {chapters.length} chapters, about {seconds} seconds
            </span>
            <button type="button" className="textButton exploreLink" onClick={() => setMode("explore")}>
              Explore the model
              <Icon name="arrow-right" size={14} />
            </button>
          </div>
        )}
      </header>

      <LayerBands
        mode="story"
        focus={started ? chapter.layer : null}
        range={started && !chapter.compare ? [chapter.from, chapter.to] : null}
        node={started ? (chapter.node ?? null) : null}
        revealTo={revealTo}
        compare={started ? (chapter.compare?.run ?? null) : null}
        scaleMax={scaleMax}
      />
      <p className="chartNote">
        Each band is the average stress on that group, scaled to the highest point in this run.
      </p>

      <div className="chapterPanel">
        <ol className="chapterSteps" aria-label="Chapters">
          {chapters.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className={
                  started && i === index ? "step current" : started && i < index ? "step done" : "step"
                }
                aria-current={started && i === index ? "step" : undefined}
                onClick={() => goTo(i)}
              >
                <span className="stepBar" aria-hidden="true" />
                <span className="stepTitle">{c.label}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="chapterText" aria-live="polite">
          <p className="chapterCount">
            {started ? `Chapter ${index + 1} of ${chapters.length}` : "First chapter"}
          </p>
          <h2>{shown.label}</h2>
          {started && shown.compare && (
            <p className="compareKey">
              <span className="compareSwatch" aria-hidden="true" />
              Blue line: the same shocks with {shown.compare.label.toLowerCase()}
            </p>
          )}
          {shown.paragraphs.map((p, i) => (
            <p key={i} className="chapterBody">
              <StoryText paragraph={p} />
            </p>
          ))}
          {shown.research && (
            <aside className="research" aria-label="Research on job loss and health">
              <p>
                <span className="researchLabel">Research, not model output.</span>{" "}
                {RESEARCH[shown.research].finding}{" "}
                <a href={RESEARCH[shown.research].href} target="_blank" rel="noreferrer">
                  {RESEARCH[shown.research].citation}
                </a>
              </p>
            </aside>
          )}
          <SourceLine paragraphs={shown.paragraphs} />
        </div>

        <div className="chapterControls">
          {!started ? null : finished ? (
            <>
              <button type="button" className="primary" onClick={() => setMode("explore")}>
                Explore the model
                <Icon name="arrow-right" size={15} />
              </button>
              <button type="button" className="secondary" onClick={() => goTo(0)}>
                <Icon name="restart" size={14} />
                Replay the story
              </button>
              <button type="button" className="textButton" onClick={() => goTo(index - 1)}>
                <Icon name="chevron-left" size={15} />
                Back
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
              {!still(chapter) && (
                <button
                  type="button"
                  className="secondary"
                  onClick={togglePlay}
                  aria-label={
                    isPlaying ? "Pause" : atChapterEnd ? "Replay this chapter" : "Play this chapter"
                  }
                >
                  <Icon name={isPlaying ? "pause" : "play"} size={13} />
                  {isPlaying ? "Pause" : atChapterEnd ? "Replay chapter" : "Play"}
                </button>
              )}
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
              <button type="button" className="textButton exploreLink" onClick={() => setMode("explore")}>
                Explore the model
                <Icon name="arrow-right" size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Summary({ summary }: { summary: RunSummary }) {
  const t = useAppStore((s) => s.t);
  const steps = useAppStore((s) => s.steps);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const play = useAppStore((s) => s.play);
  const pause = useAppStore((s) => s.pause);
  const setT = useAppStore((s) => s.setT);
  const setMode = useAppStore((s) => s.setMode);
  const setScenario = useAppStore((s) => s.setScenario);
  const setSteps = useAppStore((s) => s.setSteps);
  const result = useAppStore((s) => s.result)!;
  const last = steps - 1;
  const scaleMax = useMemo(() => storyScale(result, [], []), [result]);

  const applyStorySettings = () => {
    setScenario({ lagPreset: STORY_SETTINGS.lagPreset, bufferPreset: STORY_SETTINGS.bufferPreset });
    setSteps(STORY_SETTINGS.steps);
    setT(0);
  };

  return (
    <section className="story" aria-labelledby="story-headline">
      <header className="finding">
        <h1 id="story-headline">
          <StoryText paragraph={summary.headline} />
        </h1>
        {summary.reason === "settings" && (
          <div className="settingsNote">
            <p>
              The written story for this scenario uses medium lags, medium buffers and 24 months. You have
              changed one of those, so this is a summary of your run.
            </p>
            <button type="button" className="secondary" onClick={applyStorySettings}>
              Use the story's settings
            </button>
          </div>
        )}
      </header>

      {/* Until it plays, the summary shows the whole run. */}
      <LayerBands mode="story" revealTo={isPlaying || t > 0 ? 0 : last} scaleMax={scaleMax} />
      <p className="chartNote">
        Each band is the average stress on that group, scaled to the highest point in this run.
      </p>

      <div className="chapterPanel summaryPanel">
        <div className="chapterText">
          {summary.paragraphs.map((p, i) => (
            <p key={i} className="chapterBody">
              <StoryText paragraph={p} />
            </p>
          ))}
          <SourceLine paragraphs={[summary.headline, ...summary.paragraphs]} />
        </div>
        <div className="chapterControls">
          <button
            type="button"
            className="secondary"
            onClick={() => (isPlaying ? pause() : play(t >= last ? { from: 0, to: last } : undefined))}
          >
            <Icon name={isPlaying ? "pause" : "play"} size={13} />
            {isPlaying ? "Pause" : t >= last ? "Play again" : "Play"}
          </button>
          <button type="button" className="textButton exploreLink" onClick={() => setMode("explore")}>
            Explore the model
            <Icon name="arrow-right" size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
