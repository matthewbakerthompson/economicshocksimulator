📘 Project Delivery Plan — LLM-Guided Development
Purpose

This document defines how an LLM will assist in the end-to-end development of the Economic Stress Propagation Dashboard (and future system-modeling products).

The LLM is not a code generator alone — it is a design partner, reviewer, and delivery assistant operating under strict constraints.

1. LLM Role Definition

The LLM operates as:

🧠 Systems Modeler

🧱 Architecture & Data Design Advisor

🧪 Simulation Logic Reviewer

🎨 UX / Visualization Design Assistant

📦 Delivery & Packaging Partner

The LLM does not:

Invent data sources

Overpromise predictive accuracy

Introduce unnecessary frameworks

Optimize prematurely

Drift outside the defined scope

2. Guiding Principles (Non-Negotiable)
2.1 Explainability First

Every output must be:

Interpretable

Traceable

Attributable

If the model cannot explain why a value changed, it must flag the limitation.

2.2 System Modeling, Not Prediction

This product:

Models pressure propagation

Does not forecast GDP, prices, or returns

Avoids claims of accuracy

Language must reflect:

“Directional stress modeling under stated assumptions.”

2.3 Human-Centered Complexity

The LLM must:

Reduce cognitive load

Prefer fewer nodes with clearer meaning

Bias toward teachable systems

3. Development Phases & LLM Responsibilities
Phase 0 — Problem Framing & Scope Lock

Objective: Prevent scope creep and false complexity.

LLM Tasks

Translate vision into:

System boundaries

Explicit non-goals

Identify:

What is modeled

What is deliberately excluded

Propose a minimal but complete system loop

Required Artifacts

System boundary diagram (conceptual)

Explicit assumptions list

Explicit exclusions list

Phase 1 — Conceptual System Model

Objective: Define the macro system before data or code.

LLM Tasks

Define:

Nodes (economic actors)

Edges (transmission channels)

Feedback loops

Assign:

Sensitivity concepts

Lag concepts

Dampening concepts

Ensure no circular logic without lag or decay

Required Artifacts

Node/Edge inventory table

Propagation logic description (math-free)

Feedback loop map

Phase 2 — Data Strategy (Defensible Inputs)

Objective: Ground the model in real, explainable signals.

LLM Tasks

Recommend:

Public, stable data sources

Proxy variables where direct data is unavailable

Tag each variable with:

Update frequency

Known limitations

Directional interpretation (↑ stress or ↓ stress)

Required Artifacts

Data dictionary

Lineage notes

“What this does not capture” section

Phase 3 — Simulation Engine Design

Objective: Enable interactive stress propagation.

LLM Tasks

Propose a discrete-time propagation model

Define:

State variables per node

Transmission rule structure

Lag handling

Dampening functions

Validate:

Stability

Non-explosive behavior

Interpretability

Required Artifacts

Pseudocode (not full implementation)

Update equation explanation (plain English)

Example propagation walkthrough

Phase 4 — Visualization & Interaction Design

Objective: Make the system explorable, not overwhelming.

LLM Tasks

Recommend:

Primary visualization metaphor (network, flow, etc.)

Interaction patterns (sliders, drag/drop, timeline)

Ensure:

Visual encodings are consistent

Uncertainty is visible

Explanations are one click away

Required Artifacts

Screen-by-screen layout plan

Visual encoding legend

Interaction rules (“what happens when user does X”)

Phase 5 — MVP Definition

Objective: Ship something real without dilution.

LLM Tasks

Ruthlessly constrain scope to:

One shock type

One propagation loop

One timeline

Identify:

What must work flawlessly

What can be static or stubbed

Define MVP success criteria

Required Artifacts

MVP feature checklist

Deferred features list

Known limitations statement

Phase 6 — Implementation Support

Objective: Assist without overstepping.

LLM Tasks

Review:

Architecture decisions

Data flow

Performance risks

Generate:

Clear, modular code suggestions when requested

Flag:

Hidden complexity

Future refactor risks

Constraints

Full files only when generating code

No partial snippets unless explicitly requested

No hallucinated libraries

Phase 7 — Validation & Sanity Checking

Objective: Ensure the model behaves like a system, not a toy.

LLM Tasks

Propose:

Extreme scenario tests

Sensitivity tests

“Does this make sense?” checks

Identify:

Counterintuitive outcomes

Feedback runaway risks

Required Artifacts

Scenario validation table

Known failure modes list

Phase 8 — Packaging & Delivery

Objective: Make the product understandable and defensible.

LLM Tasks

Assist with:

Narrative framing

Onboarding explanations

“How to read this” guides

Ensure:

No misleading language

Clear distinction between model and reality

Required Artifacts

User-facing explanation

Assumptions & limitations page

Example scenarios walkthrough

4. LLM Communication Protocol
The LLM must:

Ask for clarification only when ambiguity blocks progress

Explicitly state uncertainty

Prefer structured outputs (tables, steps, diagrams)

Reuse established terminology consistently

The LLM must not:

Introduce new concepts without mapping them to existing ones

Redefine terms mid-project

Optimize prematurely

Claim “best practices” without justification

5. Success Criteria

This project is successful if:

Users understand why stress propagates

Different assumptions lead to different outcomes

The system feels educational, not predictive

The model fails honestly instead of silently

6. Future Extension Guardrail

Any future expansion must:

Reuse the same propagation engine

Add depth, not parallel complexity

Preserve explainability

End of Plan



Yes. You can make this feel *very* modern: interactive, explorable, “move a slider → watch the system respond,” with visuals that look closer to a strategy game / systems map than a BI dashboard.

Here are a few “cutting edge” ways to do it, plus what I’d pick.

## What the experience should feel like

User controls (left panel):

* Shock type (rates / unemployment / energy / credit tightening / liquidity)
* Magnitude + duration
* Where it enters (consumer / credit / markets)
* Optional toggles (policy response on/off, lag assumptions, buffers)

Main canvas:

* A network map (Consumers → Credit → Markets + feedback edges)
* Stress waves animate through edges over time
* Node size/color = pressure
* Edge thickness/pulse = transmission intensity
* Scrubbable timeline + play/pause
* Hover a node: “Why it moved” (top drivers, lag, dampeners)

That’s the product.

---

## Visual tech options that can deliver this

### Option A (my default pick): **WebGL network + dashboard panels**

Best for: *“wow” factor + performance + scalable graphs*

* **Sigma.js (WebGL graph)** or **Cytoscape.js (graph UI)** for the network
* **Deck.gl** if you want high-performance layers and effects
* **React** (or Svelte) for UI + state
* **Plotly / Observable Plot / D3** for supporting charts (timeline, distributions)

Why it works:

* WebGL handles thousands of nodes/edges smoothly
* You can animate “shock waves” convincingly
* Easy to deploy as a web app (no install)

When to choose sigma vs cytoscape:

* **Sigma.js**: fast, beautiful, WebGL-first, great for large graphs
* **Cytoscape.js**: more “interactive editor” feel (drag nodes, edit edges), tons of plugins

---

### Option B: **3D “macro world” (Three.js)**

Best for: *flashy, immersive, marketing-friendly demos*

* **Three.js** for a 3D scene (nodes as spheres, edges as tubes)
* Post-processing (glow, trails) to make propagation pop
* Great for storytelling + demos

Tradeoff:

* More engineering + design work than Option A
* Harder to keep “serious” unless you anchor it with clear tooltips and charts

---

### Option C: **Notebook-style interactive (Observable / web notebooks)**

Best for: *fast iteration + education-first product*

* Observable framework (or similar) gives:

  * sliders
  * live charts
  * reactive graphs
  * shareable “scenarios”

Tradeoff:

* Less “app-like” polish unless you invest in productization

---

## The simulation engine that makes it real

You can run the propagation model in the browser (fast + private) or on the server (more powerful). The “cutting edge” feel comes from **real-time response**, so you want most interactions to be sub-100ms.

### Simple but powerful approach: discrete-time propagation

At each timestep *t* (week/month):

* Each node has a **stress state** `S[t]`
* Shock adds to one or more nodes
* Stress flows along edges using weights + lags + dampening

Conceptually:

* `S_next = S_current + ExternalShock + (TransmissionMatrix × S_lagged) - Dampening(S_current)`

Where:

* **TransmissionMatrix** encodes “how pressure moves”
* **Lag** is handled via delayed state buffers (e.g., consumers impact credit 1–2 months later)
* **Dampening** is buffers (savings, policy response, liquidity)

This is extremely interactive and explainable.

### Make it user-trustworthy: show “why”

Every node update should produce an attribution payload:

* “+0.12 from rate shock sensitivity”
* “+0.05 from market volatility feedback”
* “-0.03 from consumer buffer (savings proxy)”
* “lagged 2 months”

That’s how you avoid the black-box problem.

---

## “Users simulate shocks themselves” — interaction patterns

You can go beyond sliders:

### 1) Scenario builder

* Users create a stack of shocks:

  * “Rates +150 bps over 3 months”
  * “Unemployment +1.2% starting month 4”
  * “Credit tightening event month 2”
* Save/share scenario links

### 2) Drag-and-drop shock injection

* Drag a “shock token” onto a node (Consumers / Credit / Markets)
* Drop it; the map animates immediately

### 3) What-if branching

* Baseline line (gray)
* Scenario line (live)
* Branch A vs B (e.g., “policy response ON vs OFF”)

This makes it feel like a simulator, not a chart.

---

## What I’d build first (MVP that still feels impressive)

**One network view + timeline + scenario controls**

* 12–24 nodes max (keep it interpretable)
* 30–60 edges (enough to show feedback)
* 6–12 timesteps (months)
* 3 shock types:

  * rate shock
  * unemployment shock
  * energy/inflation shock

And very polished:

* smooth animations
* tooltips with attributions
* “confidence” shading (don’t pretend certainty)

---

## Architecture to keep it snappy

### Front-end

* React + WebGL graph (Sigma.js)
* A state store (Zustand/Redux) holding:

  * graph structure
  * node parameters
  * shock schedule
  * simulation results (arrays per node over time)

### Simulation layer

* Start with pure TypeScript in-browser
* If it grows:

  * move to Web Worker (keeps UI smooth)
  * optionally WASM later (Rust) for speed

### Back-end (optional early; useful later)

* Save scenarios, user profiles
* Publish curated scenarios (“2008-style credit crunch,” “oil shock,” etc.)
* Serve parameter presets by country / region

---

## “Cutting edge” visual features worth doing

* **Propagation trails** on edges (animated pulses)
* **Time scrubbing** with interpolation (feels fluid)
* **Uncertainty visualization**

  * node color = expected stress
  * halo/blur radius = uncertainty
* **Explainability panel** that updates on hover/click
* **Replay recorder**

  * export a short “scenario playback” clip or shareable link

---

## My recommendation

If you want something that feels modern *and* productizable:

**Go with Option A: React + Sigma.js (WebGL) + a discrete-time propagation engine in a Web Worker.**

It’ll look impressive, run fast, and scale into a real platform.

---

## Locked Decisions (Current Direction)

These are now considered **locked** for the MVP unless explicitly revisited:

- **Primary visualization**: **Network map**
- **Visual style**: **Neon-cosmos** (dark canvas, emissive glow, stress “auroras”, pulse trails)
- **Graph renderer**: **Sigma.js (WebGL)**
- **Simulation runtime**: **In-browser discrete-time engine in a Web Worker**
- **First shock for MVP**: **Unemployment shock**

---

## MVP: Unemployment Shock (Explainable Stress Propagation)

### User Inputs (Scenario Controls)
- **Shock magnitude**: \u0394 unemployment (percentage points)
- **Shock onset**: start month
- **Shock duration**: number of months
- **Injection point**: defaults to **Consumers** (MVP keeps this simple)
- **Optional toggles (MVP)**: lag preset (short/medium/long), buffers preset (low/med/high)

### System Loop (MVP Scope)
Keep the system teachable and consistent with the macro layers:

- **Consumers \u2192 Credit**: unemployment \u2191 \u2192 income stress \u2191 \u2192 delinquency/default pressure \u2191 (buffered by savings / policy)
- **Credit \u2192 Markets**: losses \u2191 \u2192 risk \u2191 \u2192 liquidity/funding stress \u2191
- **Markets \u2192 Credit**: liquidity stress \u2191 \u2192 credit tightening \u2191 (lagged)
- **Credit \u2192 Consumers**: tightening \u2191 \u2192 refinancing/borrowing stress \u2191 \u2192 consumers stress \u2191 (lagged)

**Non-goal reminder**: This is **directional stress modeling under stated assumptions**, not forecasting.

---

## Screen-by-Screen Layout (MVP)

### 1) Main Simulation Screen
- **Left panel (Scenario Builder)**:
  - Shock editor (unemployment)
  - Presets (baseline, “mild recession”, “severe recession”)
  - Run controls: play/pause, reset, step
- **Center (Neon-Cosmos Network Canvas)**:
  - Sigma.js network map
  - Animated edge pulses (propagation)
  - Node glow/halo (stress + uncertainty)
  - Click node to pin details; hover for quick tooltip
- **Right panel (Explainability / Receipts)**:
  - “Why this moved” per timestep (top contributors, lag, dampener)
  - Current node parameters (sensitivity, buffer strength)
- **Bottom (Timeline)**:
  - Scrubbable timeline (6–12 months)
  - Baseline vs scenario overlay (MVP can start with baseline = “no shock”)

### 2) Assumptions & Limitations (User-Facing)
- What is modeled (layers, nodes, edges)
- What is not modeled (forecasting, firm-level, real-time feeds)
- How to interpret results (directional, comparative, assumption-driven)

---

## Visual Encoding (Neon-Cosmos, Consistent + Interpretable)
- **Node core color**: stress level (cool \u2192 hot)
- **Node halo radius / blur**: uncertainty / sensitivity
- **Edge thickness**: transmission strength
- **Edge pulses**: propagation over time (timing respects lag)
- **Legend always visible**: what color/halo/pulse means

---

## Implementation Plan (Vertical Slice First)

### Slice A — Simulation Engine + Attribution (must be flawless)
- Define graph schema (nodes/edges; weight, lag, dampening/buffer)
- Implement discrete-time propagation loop with:
  - lag buffers
  - dampening/decay (non-explosive behavior)
  - clamping/normalization (stable ranges)
- Produce an **attribution payload** per node per timestep:
  - “+\u0394 from unemployment shock”
  - “+\u0394 from incoming edge X (lagged k)”
  - “-\u0394 from buffer/dampener”

### Slice B — Sigma.js Renderer + Playback
- Render nodes/edges with neon-cosmos styling
- Animate pulses based on propagation events
- Timeline scrub/play that replays deterministic results

### Slice C — Shock UX (User-Driven Simulation)
- Unemployment shock editor
- Presets + reset
- Optional: drag-and-drop “shock token” onto Consumers

### Slice D — Onboarding + Packaging
- “How to read this map”
- Example scenario walkthrough
- Clear limitations language

---

## MVP Graph Spec (Concrete Node + Edge Inventory)

This is the **authoritative** MVP graph for implementation. Keep it small, legible, and explainable.

### Node Inventory (14 nodes)

Each node has a stress state \(S \in [0, 1]\) where **higher = worse** (more stress / tighter conditions / weaker demand).

| Node ID | Layer | Display Name | What it represents (plain English) | Stress increases when… |
|---|---|---|---|---|
| consumers_unemployment | Consumers | Unemployment Pressure | Joblessness pressure felt by households (the unemployment shock enters here) | the user applies an unemployment shock |
| consumers_income | Consumers | Income Stress | Income disruption / income insecurity | unemployment pressure rises |
| consumers_confidence | Consumers | Confidence Shock | Confidence / sentiment deterioration | income stress rises; markets feel “risk-off” |
| consumers_savings | Consumers | Savings Buffer Depletion | Household buffers being used up | income stress persists; demand weakness persists |
| consumers_demand | Consumers | Demand Weakness | Reduced consumption / demand shortfall | income stress rises; confidence worsens |
| consumers_delinquency | Consumers | Delinquency Pressure | Missed payments / delinquencies | income stress rises; credit access tightens; borrowing costs rise |
| credit_bank_losses | Credit | Bank Loss Pressure | Credit losses / charge-offs pressure | delinquency pressure rises |
| credit_bank_capital | Credit | Bank Capital Tightness | Capital constraint pressure and balance sheet strain | bank losses rise |
| credit_standards | Credit | Credit Standards Tightness | Underwriting and lending standards tighten | bank capital tightness rises; markets liquidity stress rises |
| credit_access | Credit | Household Credit Access Stress | Difficulty obtaining/refinancing credit | standards tighten; borrowing costs rise |
| credit_borrow_cost | Credit | Borrowing Cost Pressure | Spread / rate pressure on household borrowing | markets liquidity stress rises; risk aversion rises; standards tighten |
| markets_risk | Markets | Risk Aversion | Broad “risk-off” regime | bank losses rise; volatility rises; confidence worsens |
| markets_liquidity | Markets | Funding/Liquidity Stress | Funding stress, liquidity scarcity, higher funding premia | risk aversion rises; volatility rises |
| markets_volatility | Markets | Volatility Shock | Volatility regime / uncertainty spike | confidence worsens; risk aversion rises |

Notes:
- **Shock injection (MVP)**: user shock is applied to `consumers_unemployment` (still “Consumers layer”).
- **Explainability requirement**: every node update must emit receipts attributing change to incoming edges + dampeners + direct shock.

---

### Edge Inventory (Transmission Channels)

Each edge defines: **from → to**, a conceptual channel, and a typical **lag** (months). Weights are parameters (start with sensible defaults).

| From | To | Channel | Typical lag | Interpretation (why it moves) |
|---|---|---:|---:|---|
| consumers_unemployment | consumers_income | Labor → income | 0–1 | joblessness pressure worsens household income stress |
| consumers_income | consumers_demand | Income → demand | 0–1 | income stress increases demand weakness |
| consumers_income | consumers_savings | Income → buffers | 1–2 | persistent income stress depletes savings buffers |
| consumers_confidence | consumers_demand | Sentiment → demand | 0–1 | lower confidence increases demand weakness |
| consumers_income | consumers_delinquency | Income → delinquencies | 1–2 | income stress increases delinquency pressure |
| credit_access | consumers_delinquency | Credit access → delinquencies | 0–2 | reduced access/refi ability increases delinquency pressure |
| credit_borrow_cost | consumers_delinquency | Borrowing costs → delinquencies | 0–2 | higher borrowing costs increase delinquency pressure |
| consumers_delinquency | credit_bank_losses | Delinquencies → losses | 1–2 | higher delinquencies increase bank loss pressure |
| credit_bank_losses | credit_bank_capital | Losses → capital | 0–1 | loss pressure tightens capital constraints |
| credit_bank_capital | credit_standards | Capital → standards | 1–2 | capital tightness increases standards tightness |
| markets_liquidity | credit_standards | Liquidity → standards | 0–2 | funding stress drives tightening |
| credit_standards | credit_access | Standards → access | 0–1 | tighter standards reduce access |
| markets_liquidity | credit_borrow_cost | Liquidity → borrowing costs | 0–1 | funding stress increases spreads/borrowing costs |
| markets_risk | markets_liquidity | Risk → liquidity | 0–1 | risk-off increases liquidity stress |
| markets_volatility | markets_liquidity | Vol → liquidity | 0–1 | volatility spikes reduce liquidity |
| credit_bank_losses | markets_risk | Losses → risk | 0–2 | rising losses increase risk aversion |
| consumers_confidence | markets_volatility | Confidence → vol | 0–2 | collapsing confidence can increase volatility regime |
| markets_risk | consumers_confidence | Risk → confidence | 0–2 | risk-off feeds back into confidence |
| credit_borrow_cost | consumers_demand | Borrowing costs → demand | 0–2 | higher costs increase demand weakness |

Guardrails:
- Every feedback loop must include **lag and/or decay** to prevent runaway behavior.
- Clamp \(S\) to \([0, 1]\) and apply node-level decay/dampening each step.

---

### Starter Parameter Presets (for fast iteration)

These are not “truth”—they are **assumptions presets** for exploration.

#### Unemployment Shock Presets
- **Baseline**: \(\Delta u = 0.0\)pp, duration 0
- **Mild recession**: \(\Delta u = +1.0\)pp, duration 4 months
- **Severe recession**: \(\Delta u = +3.0\)pp, duration 8 months

#### Lag Presets (applied as multipliers to typical lag)
- **Short**: 0.75×
- **Medium**: 1.0×
- **Long**: 1.25×

#### Buffer Presets (node dampening strength)
- **Low buffers**: weaker dampening, slower recovery
- **Medium buffers**: default
- **High buffers**: stronger dampening, faster recovery

Implementation note:
- Store presets as JSON and ensure simulations are deterministic + replayable (same inputs → same timeline).
