import { presetById } from "../sim/presets";
import type { CausalEvent, Scenario } from "../sim/types";
import { WRITTEN_STORIES } from "./presetStories";
import { Runs } from "./runs";
import { summarize } from "./summary";
import type { StoryView } from "./types";

export type { RunSummary, StoryChapter, StoryView, WrittenStory } from "./types";

/** The settings the written stories describe. Any other run gets a summary instead. */
export const STORY_SETTINGS = { lagPreset: "medium", bufferPreset: "medium", steps: 24 } as const;

const sameEvent = (a: CausalEvent, b: CausalEvent) =>
  a.type === b.type &&
  a.magnitude === b.magnitude &&
  a.startStep === b.startStep &&
  a.durationSteps === b.durationSteps;

/** Whether this run is the one a preset's written story describes. */
export function isStoryRun(presetId: string, scenario: Scenario, steps: number): boolean {
  const preset = presetById(presetId);
  return (
    !!preset &&
    preset.id in WRITTEN_STORIES &&
    scenario.lagPreset === STORY_SETTINGS.lagPreset &&
    scenario.bufferPreset === STORY_SETTINGS.bufferPreset &&
    steps === STORY_SETTINGS.steps &&
    scenario.events.length === preset.events.length &&
    preset.events.every((e, i) => sameEvent(e, scenario.events[i]))
  );
}

export function hasWrittenStory(presetId: string): boolean {
  return presetId in WRITTEN_STORIES;
}

/** The written story for a preset's own run, or a plain summary of any other run. */
export function storyFor(presetId: string, scenario: Scenario, steps: number): StoryView {
  const runs = new Runs(scenario, steps);
  if (isStoryRun(presetId, scenario, steps)) {
    const story = WRITTEN_STORIES[presetId](runs);
    if (story.checks.every(([, holds]) => holds)) return story;
  }
  return summarize(runs, hasWrittenStory(presetId) ? "settings" : "no-story");
}
