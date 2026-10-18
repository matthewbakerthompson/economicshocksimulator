# Changelog

## Unreleased

### Fixed
- An unemployment shock now raises unemployment by its size. Before, the full size
  was added in every month the shock lasted: a 1-point rise over four months raised
  unemployment by about 3.7 points, and the 1.5-point rise in "Stagflation meets an
  oil glut" hit the 6-point top of the scale. The size is now spread over the
  months the shock lasts.

### Stories
- "Stagflation meets an oil glut" and "Unemployment shock" have written stories,
  in eight and five chapters. Each chapter covers one part of what happens, such as
  layoffs, missed payments, banks or feedback, and the last compares the run with a
  rerun using high buffers. The text is fixed, every number in it is computed from
  the run, and tests check the numbers against the model.
- Other scenarios, and the two presets with changed settings, get a short factual
  summary.
- Some results are given in people: people out of work (BLS labor force), people
  with a new foreclosure (New York Fed data, scaled to 2008–10) and banks
  tightening small-business lending (Federal Reserve loan officer survey, scaled to
  2008). They are tinted, name their source, and are given as ranges where the
  scale is a convention.
- Health after job loss is quoted from published research next to the layoffs. The
  model computes none of it.
- Stress values from 0 to 1 no longer appear in the story. Explore still shows them.
- The chart draws the part each chapter is about and marks its peak, keeps
  showing months already covered when a chapter goes back in time, and draws the
  high-buffer rerun as a blue line. Story charts are scaled to the run's highest
  point.
- About the model opens a panel with how the model works, every source and
  caveat, and the model's limits.
- Feedback is measured by rerunning without the two channels that close every loop.

### Interface (#9, #10)
- The app opens on the story. Explore has the scenario editor, a chart of the
  three groups that opens into their parts, a map, a table and the receipts for
  each change.
- Parts are named for the pressure they measure (Confidence loss, Capital strain,
  Credit squeeze), so a higher number is always worse. Channel names say what
  happens ("Missed payments become loan losses").
- Links hold the view, scenario, month and selected part.
- "Oil glut on its own" is replaced by "Stagflation alone".
- A white page, one red for stress on a square-root scale, and one typeface,
  Libre Franklin. Text contrast is at least 5:1, touch targets are at least 24px,
  and the chart works from the keyboard.
- Text throughout the app and this repository is rewritten in plain language.

## 0.2.0 (2026-10-17)

Shocks no longer saturate the graph. Before, any shock, even half a point of
unemployment for one month, drove every node to its ceiling and held it there for
the rest of the run. Edges now pass on the new stress their source took on rather
than its whole level, so an edge's weight is its pass-through and the system is
stable by construction. In the default scenario (unemployment +1 pp for four
months), households peak around 0.6, the banks move a little, markets barely move,
and every layer is fading by month 24. (#4)

### Model
- Edges pass on new stress, not the source's level, so feedback loops can no
  longer grow without bound. (#4)
- A clamp at 0 or 1 now leaves a receipt, so every change in a node's stress is
  accounted for. (#4)
- The short lag preset now shortens lags. Before, rounding left it identical to
  medium. (#4)

### Demo, tests and tooling
- Live demo on GitHub Pages, deployed from `main`. (#1)
- Vitest tests over the engine and events: determinism, bounds, lag timing,
  receipts and the event rules. (#1, #4)
- CI runs lint, type-check, tests and build on every pull request and push to
  `main`, and `main` now requires that check to pass before anything merges. (#1)
- MIT license. (#1)
- Dependencies: React 19, zustand 5, Vite 8, ESLint 10 and Vitest 5. TypeScript
  stays on 6.0 and sigma on 3.x for now. (#3, #6)
- Dependabot and a security policy. Minor and patch updates arrive grouped; each
  major version arrives as its own pull request. (#2, #6)

## 0.1.0 (2026-01-06)

The first version: a causal event stack (unemployment, stagflation, oil glut) with
interaction rules, deterministic propagation over a 14-node consumer, credit and
markets graph with a receipt for every move, the story console, and the graph view.
