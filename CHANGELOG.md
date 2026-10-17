# Changelog

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
