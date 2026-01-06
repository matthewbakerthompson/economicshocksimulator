# Economic Shock Simulator

An interactive, **explainable** macro stress propagation simulator with a neon-cosmos aesthetic.

This product models **directional stress propagation under stated assumptions** (it is not forecasting).

## Quick start (Windows PowerShell)

```powershell
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Scripts

- **dev**: `npm run dev` (Vite dev server)
- **build**: `npm run build` (TypeScript + production build)
- **preview**: `npm run preview` (serve production build)
- **lint**: `npm run lint` (ESLint)
- **format**: `npm run format` (Prettier)

## Project structure (high level)

- `src/components/`: UI components (currently the main app panels/canvas)
- `src/sim/`: simulation engine + worker + story generation
  - `engine.ts`: deterministic discrete-time propagation + receipts
  - `events.ts`: causal event stack + interaction rules
  - `story.ts`: story beats derived from sim output (for the story console)
- `src/state/`: app state (Zustand)
- `src/theme/`: theme tokens and global theme CSS
- `src/ui/`: rendering helpers (color ramps, overlays, 2D math)
- `src/features/`: feature module entrypoints (barrel exports)
  - `src/features/simulator/index.ts`: stable import surface for simulator feature
- `src/shared/`: shared exports (theme/colors)

## Core concepts

### Causal event stack (scenario composer)
Users can stack events (start/duration/magnitude). Example: **oil glut during stagflation**.

- The simulator applies **event injections** (positive or negative stress) to selected nodes
- Plus **regime modifiers** (e.g., stagflation increases persistence / transmission)
- Story output explicitly calls out interactions where defined

### Explainability
Every step produces receipts per node:
- `shock`: direct event effects (and event interaction notes)
- `edge`: transmission along a channel (with lag + weight)
- `dampener`: buffers/decay (stability + realism guardrail)

The UI renders this as a **story console** that scrolls as the sim plays and lets users click any month to jump back.

## Adding a new event type (recommended workflow)

1. Add the event type to `src/sim/types.ts` (`EventType`)
2. Implement injections + interaction behavior in `src/sim/events.ts`
3. Add a UI affordance in `src/components/ControlsPanel.tsx`
4. (Optional) Add story phrasing in `src/sim/story.ts`

## Non-goals (by design)
- Forecasting GDP/prices/returns
- Firm-level stress testing
- Real-time market feeds
- “Black box” outputs without receipts


