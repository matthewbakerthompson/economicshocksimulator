# Changelog

## Unreleased

**A new interface built around the cascade and its receipts.** The network is
drawn in three layers (consumers, credit, markets), so stress visibly moves from
households to banks to markets. A heatmap of every node in every month shows the
whole run at a glance. The inspector explains the selected node's move with bars
that sum to the change, and links to the channels that caused it.

### Interface
- The network is an accessible SVG with labeled nodes, replacing the Sigma
  WebGL graph and its overlay. sigma and graphology are no longer dependencies.
- Each month gets a headline (its biggest move) and a line on which events are
  active, have ended or are still to come, replacing the story console.
- Every edit re-runs the model; there is no Run button. The app opens on a
  preset, plays it through once, and starts at month 12 instead for visitors
  who prefer reduced motion.
- Presets, segmented controls for lags, buffers and a 12, 18 or 24-month
  horizon, and keyboard control of the timeline.
- Layouts for tablets and phones.
- Shareable links: the URL hash holds the scenario, month and selected node, a
  Copy link button copies it, and bad or old links fall back to the default.
- A table view of every node's stress, change and peak, and a story view that
  tells the run month by month in plain language, with no ids or repeats.
- Stress colors use a square-root scale, so small shocks show downstream; the
  legend says so.
- Every input has an accessible name with its units.
- Receipts name the source node rather than its id, and channels too small to
  print fold into one row.

## 0.2.0 (2026-10-17)

**Shocks no longer saturate the graph.** Before, any shock, even half a point of
unemployment for one month, drove every node to its ceiling and held it there for
the rest of the run. Edges now pass on the new stress their source took on rather
than its whole level, so an edge's weight is its pass-through and the system is
stable by construction. In the default scenario (unemployment +1 pp for four
months), households peak around 0.6, the banks take a nick, markets barely move,
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
