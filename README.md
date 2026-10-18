# Economic Shock Simulator

[![ci](https://github.com/matthewbakerthompson/economicshocksimulator/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/matthewbakerthompson/economicshocksimulator/actions/workflows/ci.yml)
[![pages](https://github.com/matthewbakerthompson/economicshocksimulator/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/matthewbakerthompson/economicshocksimulator/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A model of how an economic shock moves between households, banks and markets, with the cause of every change shown. It shows direction and timing under stated assumptions. It is not a forecast.

**[Live demo](https://matthewbakerthompson.github.io/economicshocksimulator/)**. It runs in the browser; the simulation runs in a Web Worker.

Questions and ideas go in [Discussions](https://github.com/matthewbakerthompson/economicshocksimulator/discussions). Changes are listed in [CHANGELOG.md](CHANGELOG.md).

![The story view for "Stagflation meets an oil glut", chapter 5 of 8, "Banks". The headline reads: two years after stagflation sets in, missed payments are still at 75% of their peak. Three bands show stress on households, banks and credit, and markets over 24 months, with the banks' band in red, the line for loan losses marked at its peak in month 17, and months 6 to 17 shaded. The text below says a net 17% to 20% of banks are tightening standards on loans to small businesses, tinted as a translation, with its source underneath.](docs/images/simulator.jpg)

## Using it

The app opens on a story for the selected scenario. Two scenarios have written stories:

- **Stagflation meets an oil glut**: 10 months of stagflation, a 1.5-point rise in unemployment and an oil glut, in eight chapters.
- **Unemployment shock**: a 1-point rise in unemployment over four months, in five chapters.

Each chapter covers one part of what happens, such as layoffs, missed payments, banks or feedback, and plays the months it covers. The last chapter compares the run with a rerun using high buffers. **Back**, **Next**, **Play**, **Restart** and **Replay the story** move through it.

Tinted numbers turn a model result into people: people out of work, people with a new foreclosure, banks tightening lending. Each one names its source under the chapter, and **About the model** explains how each is calculated and where it falls short. Notes on health after job loss quote published research; the model computes none of it.

The written stories describe the run with medium lags, medium buffers and 24 months. With other settings, or with any other scenario, the story view shows a short factual summary of the run instead.

![The Explore view at month 12: the scenario's shocks on the left, the household layer opened into its six parts in the middle, and the panel on the right showing why missed payments rose from month 11 to 12.](docs/images/explore.jpg)

**Explore** shows the whole model:

- **Your scenario (left):** add shocks (unemployment, stagflation, an oil glut) and set each one's size, first month and length. Lags, buffers and the number of months are under *Model assumptions*. The model reruns after every change.
- **Layers, Map and Table (centre):** *Layers* shows the three groups, each of which opens into its parts. *Map* shows the 14 parts and the channels between them. *Table* lists each part's stress, change and peak. Play, step, restart, or drag across the chart to change the month; the arrow keys work too.
- **Why it moved (right):** the selected part's stress over time, and the receipts for this month's change: each event or channel that moved it, with amounts that add up to the change. Select a channel to follow the stress back to its source.

Parts are named for the pressure they measure (*Confidence loss*, *Capital strain*, *Credit squeeze*), so a higher number is always worse. Stress is drawn in one red on a square-root scale, so small values stay visible. Relief is drawn in blue.

**Share:** the address bar always holds the view, scenario, month and selected part, and **Copy link** copies it. A story link with a month opens on the chapter that covers that month. The link reads like `#view=story&events=s0.65@0-9,o0.7@3-7,u1.5@2-7&lags=medium&buffers=medium&horizon=24&month=14&node=consumers_delinquency`: each event is a type letter (u, s or o), its size, and its first and last month. Anything missing or invalid falls back to the default.

## Quick start (Windows PowerShell)

```powershell
npm install
npm run dev
```

Open `http://localhost:5173/economicshocksimulator/`. The app is served under the same path as on GitHub Pages.

## Scripts

- **dev**: `npm run dev` (Vite dev server)
- **build**: `npm run build` (TypeScript and production build)
- **preview**: `npm run preview` (serves the production build)
- **lint**: `npm run lint` (ESLint)
- **typecheck**: `npm run typecheck` (TypeScript, no emit)
- **test**: `npm test` (Vitest, once)
- **format**: `npm run format` (Prettier)

CI (`.github/workflows/ci.yml`) runs lint, type-check, tests and build on every pull request and push to `main`. Each push to `main` also deploys the build to GitHub Pages (`.github/workflows/pages.yml`).

## Tests

`src/sim/*.test.ts` cover the engine and events, `src/story/story.test.ts` covers the stories and summaries, and `src/ui/ui.test.ts` and `src/state/*.test.ts` cover the interface helpers and state. They check that:

- the same scenario always gives the same result, and the scenario isn't changed
- stress stays between 0 and 1 however hard a scenario pushes, and stronger buffers never leave more stress
- a small shock rises and then fades toward zero, and every feedback loop has a gain below 1
- each edge's weight is its pass-through, with no compounding
- an injection reaches each part exactly one lag later along each edge, and the short and long lag settings shorten and lengthen every lag
- every change in a part's stress is accounted for by its receipts, including a cut at 0 or 1
- an unemployment shock's size is spread over the months it lasts, so a 1-point shock raises unemployment by a little under 1 point
- leaving out the two feedback channels removes every loop from the graph
- each written story keeps its approved text, every claim it makes in words holds, its numbers match the model when worked out separately, every count of people is marked as a translation, and no 0-to-1 stress value appears in it
- a changed setting replaces the written story with a summary, and summaries say when nothing happens or when the shocks outlast the run
- the conversions to people use the cited figures and round the same way every time
- each month's line in Explore names the biggest change and says which shocks are active, have ended or are still to come
- chapters play from their first month to their last and stop, jumping to a month pauses, and playing at the end starts again
- receipts in the inspector add up to each change and use names, never ids
- share links round-trip a scenario, recognise presets, and fall back to the defaults on bad input

## Project structure

- `src/components/`: the interface: the story (`StoryMode`), Explore (`ExploreMode`), the stress chart (`LayerBands`), the map (`NetworkView`), the table, the scenario editor, the inspector and the About panel
- `src/sim/`: the simulation
  - `engine.ts`: month-by-month propagation and receipts
  - `events.ts`: what each shock does, and how shocks interact
  - `graphSpec.ts`: the 14 parts, the channels between them, and the two channels that close every loop
  - `presets.ts`: the scenarios in the top bar
  - `layers.ts`: stress for each group of parts
  - `story.ts`: each month's line in Explore
- `src/story/`: the stories
  - `presetStories.ts`: the two written stories; the prose is fixed and every number comes from the run
  - `summary.ts`: the short summary for any other run
  - `sources.ts`: the figures that turn model results into people, with their sources
  - `runs.ts`: the run and the reruns a story compares it with
- `src/state/`: app state (Zustand) and the share-link format
- `src/theme/`, `src/ui/`: colors, the network layout, and receipt formatting
- `src/hooks/`: playback, which advances by wall-clock time and stops at the end of a chapter
- `docs/`: the development plan, project plan and README images

## How the model works

### Shocks

A scenario is a list of shocks, each with a size, a first month and a length:

- **Unemployment** raises unemployment by its size in percentage points, spread evenly over the months it lasts. Six points is the top of the scale.
- **Stagflation** (severity 0 to 1) cuts confidence and spending and raises borrowing costs and risk aversion each month it lasts. While it lasts, channels pass on 8% more stress and buffers absorb 14% less.
- **Oil glut** (severity 0 to 1) lowers borrowing costs and eases volatility and funding strain. During stagflation its relief is 55% of its usual size, and the mixed signals add some risk aversion.

### Propagation

Each part's stress, from 0 to 1, is a stock. Every month:

- active shocks add stress to the parts they hit, or remove it
- each channel passes on its weight × the new stress its source took on, one lag earlier
- buffers absorb a share of each part's stress: 3.5%, 5% or 7% a month for low, medium and high
- anything that would leave the 0 to 1 range is cut, and the cut gets its own receipt

A channel passes on its source's new stress, not its source's whole level every month, so its weight is its pass-through. With nothing cut, Income squeeze is 0.55 × Unemployment two months earlier: the channel's one-month lag plus the month the change takes to show. Every feedback loop has a gain below 1. The spectral radius of the weight matrix, with lags collapsed, is about 0.58, or 0.62 with stagflation's channel multiplier, so stress fades toward zero once the shocks end. A test fails if a change to the graph pushes that bound to 1.

The short and long lag settings scale every lag by 0.75 and 1.25 and round toward the setting, so one-month lags become zero or two months and two-month lags become one or three.

### Receipts

Every month produces receipts for every part, and they add up to the part's change:

- `shock`: what an event did directly
- `edge`: what a channel passed on, with its lag and weight
- `dampener`: what buffers absorbed
- `clamp`: what the 0 to 1 limits cut off

### Numbers about people

Only unemployment has a real unit in the model. The stories turn it into people with the BLS civilian labor force: 170,262,000 in September 2026, so one point is about 1.7 million people. Missed payments and tighter lending have no unit, so the stories scale them to the worst of 2008–10: new foreclosures from the New York Fed's household debt data, and the share of banks tightening small-business lending from the Federal Reserve's loan officer survey. Those two are shown as ranges and labeled as a sense of size, not a measurement. The About panel in the app gives every figure, source and caveat, and `src/story/sources.ts` holds them in code.

### Limits

- Job losses come only from the unemployment shocks in a scenario. Weak spending and tight credit do not cost more jobs, so job counts are a floor.
- One buffer setting covers the whole economy; the model can't separate savings, safety nets and bank capital.
- Receipts attribute each change to its causes under the model's assumptions. They are not causal estimates.

## Adding a new event type

1. Add the type to `EventType` in `src/sim/types.ts`.
2. Add what it does, and how it interacts with other events, in `src/sim/events.ts`.
3. Give it a range and a description in `src/components/ScenarioRail.tsx`, and a lane label in `src/components/LayerBands.tsx`.
4. Add its name and phrasing in `src/sim/story.ts` and `src/story/summary.ts`.
5. Test what it injects and how it interacts in `src/sim/events.test.ts`.

## Not in scope

- Forecasting GDP, prices or returns
- Stress tests of individual firms
- Live market data
- Results without receipts

## License

[MIT](LICENSE)
