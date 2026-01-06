Yes — and your instinct here is exactly right.

What you have now is a **delivery discipline**, not a fully grounded execution plan.
For an LLM to be genuinely useful *through delivery* (and not quietly harmful), it **must be anchored** in:

1. **What the product *is*** (in one stable, unambiguous definition)
2. **What it is *not***
3. **What technology constraints exist**
4. **What decisions are already made vs still open**

Without that, an LLM will:

* Fill gaps with defaults
* Drift toward generic architectures
* Optimize for “impressive” instead of “correct”

Below is how I’d **fix this properly**.

---

# 📌 Required Context Addendum (LLM Anchor)

This is the **minimum context** the LLM must be given *before* it participates in planning, design, or code.

You can append this directly above the plan you already have.

---

## 1. Product Definition (Single Source of Truth)

### Product Name (Working)

**Economic Stress Propagation Simulator (ESPS)**

### Product Statement

> ESPS is an interactive, explainable simulation tool that allows users to inject macroeconomic shocks and observe how stress propagates across consumers, credit systems, and markets over time.

### Core Value

* Makes macroeconomic transmission **visible**
* Enables **what-if exploration**
* Teaches systems thinking, not prediction

---

## 2. Explicit Non-Goals (Critical)

The LLM must **never** attempt to:

* Predict asset prices or returns
* Replace institutional stress testing (CCAR, ICAAP)
* Claim forecasting accuracy
* Model individual firms or balance sheets
* Offer financial advice

Language must remain:

> “Scenario-based stress propagation under stated assumptions.”

---

## 3. Target User Profiles

### Primary

* Advanced retail investors
* Finance students / educators
* Risk-curious professionals (non-quants)

### Secondary (later)

* Consultants
* Enterprise risk teams
* Architecture & governance groups

---

## 4. Conceptual System Model (Authoritative)

### Macro Layers

1. Consumers
2. Credit System
3. Markets

### Structural Truths

* Stress propagates **directionally**
* Effects are **lagged**
* Buffers exist but decay
* Feedback loops are real and visible

The LLM must not invent:

* New layers
* Hidden variables
* Opaque transformations

---

## 5. Technology Stack (Initial Constraints)

### Frontend

* **React** (TypeScript)
* **WebGL-based graph visualization**

  * **Sigma.js (selected)**
* State management optimized for simulation playback

### Simulation Layer

* **In-browser discrete-time engine**
* Runs in a **Web Worker**
* Deterministic, replayable

### Backend (Phase 2+)

* Scenario persistence
* Preset distribution
* No real-time market feeds initially

### Data

* Public macro data only
* Low-frequency (monthly / quarterly)
* Used for **parameter grounding**, not live calculation

---

## 6. Visual Interaction Model (Locked Direction)

The primary experience is:

* A **network visualization**
* Nodes represent macro actors
* Edges represent transmission channels
* Stress animates through the network over time

Visual style direction (MVP):

* **Neon-cosmos** (dark canvas, emissive glow, stress halos, propagation pulse trails)

The LLM must not:

* Reframe this as a dashboard-first product
* Suggest table-heavy BI layouts
* Default to static charts

---

## 7. MVP Definition (Hard Boundary)

### MVP Includes

* **One shock type: unemployment shock** (selected)
* One propagation loop (Consumers → Credit → Markets → Consumers)
* 6–12 simulated time steps
* Manual parameter controls

### MVP Excludes

* AI/ML models
* Optimization
* Real-time feeds
* Multiple geographies
* Firm-level modeling

---

## 8. Decision Authority

The LLM:

* Advises
* Reviews
* Flags risks

The human:

* Decides scope
* Writes final code
* Approves architecture changes

The LLM must **defer when ambiguity exists**.

---

## 9. How the LLM Should Behave with This Context

When responding, the LLM must:

* Reference the product definition
* Respect stack constraints
* Avoid introducing new abstractions
* Propose tradeoffs explicitly
* Flag when a request violates scope

---

## 10. Final Instruction to the LLM

> If a suggestion improves realism at the cost of explainability, **reject it**.
> If a suggestion improves explainability at the cost of precision, **prefer it**.

---

### Why This Matters (Blunt)

Most “AI-assisted development” fails because:

* Context is implicit
* Constraints are unstated
* The model fills in blanks creatively

You’re doing the opposite — **you’re constraining creativity to the shape of truth**.

That’s how this becomes:

* A real product
* A defensible system
* A foundation for future expansion

---

