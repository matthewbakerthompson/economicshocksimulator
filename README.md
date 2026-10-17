# Economic Shock Simulator

[![ci](https://github.com/matthewbakerthompson/economicshocksimulator/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/matthewbakerthompson/economicshocksimulator/actions/workflows/ci.yml)
[![pages](https://github.com/matthewbakerthompson/economicshocksimulator/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/matthewbakerthompson/economicshocksimulator/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

An interactive, **explainable** macro stress propagation simulator with a neon-cosmos aesthetic.

This product models **directional stress propagation under stated assumptions** (it is not forecasting).

**[Live demo](https://matthewbakerthompson.github.io/economicshocksimulator/)**: runs entirely in the browser; the simulation runs in a Web Worker.

This is a public experiment. Questions, surprising results and ideas go in
[Discussions](https://github.com/matthewbakerthompson/economicshocksimulator/discussions);
what changed and why is in [CHANGELOG.md](CHANGELOG.md).

![Stagflation with an oil glut and an unemployment shock at month 7. Liquidity is selected, and the explainability panel lists the edges, event and buffers that moved it.](docs/images/simulator.jpg)

## Quick start (Windows PowerShell)

```powershell
npm install
npm run dev
```

Open `http://localhost:5173/economicshocksimulator/` (the app is served under the same path as on GitHub Pages).

## Scripts

- **dev**: `npm run dev` (Vite dev server)
- **build**: `npm run build` (TypeScript + production build)
- **preview**: `npm run preview` (serve production build)
- **lint**: `npm run lint` (ESLint)
- **typecheck**: `npm run typecheck` (TypeScript, no emit)
- **test**: `npm test` (Vitest, once)
- **format**: `npm run format` (Prettier)

CI (`.github/workflows/ci.yml`) runs lint, type-check, tests and build on every pull request and push to `main`.
Each push to `main` also deploys the build to GitHub Pages (`.github/workflows/pages.yml`).

## Tests

`src/sim/engine.test.ts` and `src/sim/events.test.ts` cover the simulation core:

- the same scenario always produces the same result, and the scenario isn't mutated
- stress stays within `[0, 1]` however hard the scenario pushes, and stronger buffers never leave more stress
- a small shock rises and then fades back toward zero, and every feedback loop has a gain below 1
- each edge's weight is its pass-through: a node carries weight × its sources' lagged stress, with no compounding
- an injection reaches each node along each edge exactly that edge's lag later, and the short and long lag presets make every lag shorter or longer
- every change in a node's stress is accounted for by its receipts, including a clamp at 0 or 1
- event windows, unemployment scaling, stagflation's regime modifiers, and the oil glut relief being muted under stagflation

## Project structure (high level)

- `src/components/`: UI components (currently the main app panels/canvas)
- `src/sim/`: simulation engine + worker + story generation
  - `engine.ts`: deterministic discrete-time propagation + receipts
  - `events.ts`: causal event stack + interaction rules
  - `story.ts`: story beats derived from sim output (for the story console)
  - `*.test.ts`: Vitest tests for the engine and events
- `src/state/`: app state (Zustand)
- `src/theme/`: theme tokens and global theme CSS
- `src/ui/`: rendering helpers (color ramps, overlays, 2D math)
- `src/features/`: feature module entrypoints (barrel exports)
  - `src/features/simulator/index.ts`: stable import surface for simulator feature
- `src/shared/`: shared exports (theme/colors)
- `docs/`: the development plan (`devplan.md`), project plan (`projectplan.md`) and README images

## Core concepts

### Causal event stack (scenario composer)
Users can stack events (start/duration/magnitude). Example: **oil glut during stagflation**.

- The simulator applies **event injections** (positive or negative stress) to selected nodes
- Plus **regime modifiers** (e.g., stagflation increases persistence / transmission)
- Story output explicitly calls out interactions where defined

### Propagation model
Each node's stress (0 to 1) is a stock. Every month:
- active events add stress to the nodes they hit (or remove it, for relief)
- each edge passes on its weight × the new stress its source took on, `lag` months earlier
- buffers absorb a share of the stress each node carries: 3.5%, 5% or 7% a month for low, medium and high buffers
- if the result would leave `[0, 1]`, it is clamped

An edge passes on its source's new stress, not its source's whole level every month, so its weight is its pass-through. With nothing clamped, Income Stress is 0.55 × Unemployment two months earlier (the edge's one-month lag, plus the month the change takes to show). Every feedback loop has a gain below 1: the spectral radius of the weight matrix, with lags collapsed, is about 0.58, or 0.62 with stagflation's edge multiplier. So once the events end, stress fades back toward zero. A test fails if a graph change pushes that bound to 1.

The short and long lag presets scale every lag by 0.75 and 1.25 and round toward the preset, so one-month lags become zero or two months and two-month lags become one or three.

### Explainability
Every step produces receipts per node, and they sum to the node's change in stress:
- `shock`: direct event effects (and event interaction notes)
- `edge`: transmission along a channel (with lag + weight)
- `dampener`: buffers/decay (stability + realism guardrail)
- `clamp`: whatever the `[0, 1]` bounds cut off, when stacked shocks push a node past them

The UI renders this as a **story console** that scrolls as the sim plays and lets users click any month to jump back.

## Adding a new event type (recommended workflow)

1. Add the event type to `src/sim/types.ts` (`EventType`)
2. Implement injections + interaction behavior in `src/sim/events.ts`
3. Add a UI affordance in `src/components/ControlsPanel.tsx`
4. (Optional) Add story phrasing in `src/sim/story.ts`
5. Add its injections and interactions to `src/sim/events.test.ts`

## Non-goals (by design)
- Forecasting GDP/prices/returns
- Firm-level stress testing
- Real-time market feeds
- “Black box” outputs without receipts

## License

[MIT](LICENSE)
