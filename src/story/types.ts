import type { LayerId, NodeId, SimulationResult } from "../sim/types";
import type { ResearchId } from "./sources";
import type { Paragraph } from "./text";

export type StoryChapter = {
  id: string;
  /** A plain label: "Layoffs", "Banks", "Two years later". */
  label: string;
  /** The months the chapter plays, inclusive. */
  from: number;
  to: number;
  /** The layer the chapter is about; the chart draws the others as context. */
  layer: LayerId | null;
  /** The part of the economy whose peak the chapter names; the chart draws it and marks the peak. */
  node?: NodeId;
  paragraphs: Paragraph[];
  research?: ResearchId;
  /** Draw this run over the chart for comparison, and show the whole run at once. */
  compare?: { run: SimulationResult; label: string };
};

/** A story written by hand for a preset, with every number taken from the run. */
export type WrittenStory = {
  kind: "written";
  headline: Paragraph;
  dek: Paragraph;
  chapters: StoryChapter[];
  /** Claims the prose makes in words; the story is shown only when all of them hold. */
  checks: Array<[claim: string, holds: boolean]>;
};

/** A short factual account of any run. */
export type RunSummary = {
  kind: "summary";
  headline: Paragraph;
  paragraphs: Paragraph[];
  /** Why there is no written story: none for this scenario, or the settings differ from the story's. */
  reason: "no-story" | "settings";
};

export type StoryView = WrittenStory | RunSummary;
