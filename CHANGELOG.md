# Changelog

## Unreleased

**The simulator now tells a story.** It opens on the run's finding as a headline,
for example "Three overlapping shocks reach the banks within 5 months, and 14
months after they end, bank stress is still 86% of its peak", and walks through
the run in chapters written from the data: the shocks land, each layer peaks in
the order it happens, then the aftermath. The full model is one click away in
Explore.

### Story and explore
- A guided story with Play, Back, Next, Replay and Restart. Each chapter plays its
  months and stops; nothing plays until you ask. The story ends on "That's the
  story" and hands over to Explore.
- The chart is three stress bands (households, banks and credit, markets) over the
  months, with each event's window, the chapter's months shaded, the peaks marked
  and an arrow for the lag between peaks. In Explore each band opens into its parts.
- Explore keeps the scenario editor, a map of the network, a table, and the
  receipts, now written as sentences. Restart and step controls sit with Play.
- Links carry the view and month; a story link with a month opens on its chapter.

### Clarity
- Parts of the economy are named for the pressure they measure (Confidence loss,
  Savings drawdown, Capital strain, Credit squeeze, Liquidity strain…), so a higher
  number always reads as worse. Channels are described as mechanisms ("Missed
  payments become loan losses").
- Plain words replace abbreviations, values show two decimals outside the
  receipts, and stress is defined where you read it.
- "Oil glut on its own" is replaced by "Stagflation alone": relief on a calm
  economy changes nothing, and the story now says so when you build that case.

### Design
- A light chart-desk look: a white page, grey structure, one vermilion ink for
  stress on a square-root scale, and one typeface (Libre Franklin) with tabular
  figures. No mono labels, uppercase eyebrows, pills or gradients.
- Accessible: text contrast of at least 5:1, touch targets of at least 24px,
  announcements only when a chapter changes, motion only while playing, and full
  keyboard control of the chart.
- New events start at the month you're looking at; a failed run says so.

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
