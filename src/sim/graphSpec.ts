import type { LayerId, NodeId } from "./types";

export type NodeSpec = {
  id: NodeId;
  layer: LayerId;
  label: string;
  description: string;
  x: number;
  y: number;
};

export type EdgeSpec = {
  id: string;
  from: NodeId;
  to: NodeId;
  label: string;
  typicalLag: number; // steps (months)
  weight: number; // 0..1-ish
};

// Neon-cosmos layout: three columns by macro layer, gentle vertical spread.
export const NODES: NodeSpec[] = [
  {
    id: "consumers_unemployment",
    layer: "Consumers",
    label: "Unemployment",
    description: "Joblessness pressure felt by households (shock enters here).",
    x: -1.2,
    y: 0.55,
  },
  {
    id: "consumers_income",
    layer: "Consumers",
    label: "Income Stress",
    description: "Income disruption / insecurity.",
    x: -1.35,
    y: 0.05,
  },
  {
    id: "consumers_confidence",
    layer: "Consumers",
    label: "Confidence",
    description: "Sentiment deterioration.",
    x: -1.05,
    y: -0.15,
  },
  {
    id: "consumers_savings",
    layer: "Consumers",
    label: "Savings Buffer",
    description: "Buffers being used up.",
    x: -1.55,
    y: -0.55,
  },
  {
    id: "consumers_demand",
    layer: "Consumers",
    label: "Demand Weakness",
    description: "Reduced consumption / demand shortfall.",
    x: -1.1,
    y: -0.75,
  },
  {
    id: "consumers_delinquency",
    layer: "Consumers",
    label: "Delinquencies",
    description: "Missed payments / delinquency pressure.",
    x: -1.45,
    y: -0.25,
  },
  {
    id: "credit_bank_losses",
    layer: "Credit",
    label: "Bank Losses",
    description: "Credit losses / charge-offs pressure.",
    x: 0.0,
    y: 0.3,
  },
  {
    id: "credit_bank_capital",
    layer: "Credit",
    label: "Bank Capital",
    description: "Capital constraint pressure.",
    x: -0.05,
    y: -0.1,
  },
  {
    id: "credit_standards",
    layer: "Credit",
    label: "Credit Standards",
    description: "Underwriting and lending standards tighten.",
    x: 0.15,
    y: -0.55,
  },
  {
    id: "credit_access",
    layer: "Credit",
    label: "Credit Access",
    description: "Difficulty obtaining/refinancing credit.",
    x: 0.05,
    y: -0.85,
  },
  {
    id: "credit_borrow_cost",
    layer: "Credit",
    label: "Borrow Costs",
    description: "Spread / borrowing cost pressure.",
    x: 0.35,
    y: -0.25,
  },
  {
    id: "markets_risk",
    layer: "Markets",
    label: "Risk Aversion",
    description: "Broad risk-off regime.",
    x: 1.25,
    y: 0.2,
  },
  {
    id: "markets_liquidity",
    layer: "Markets",
    label: "Liquidity",
    description: "Funding/liquidity stress.",
    x: 1.4,
    y: -0.25,
  },
  {
    id: "markets_volatility",
    layer: "Markets",
    label: "Volatility",
    description: "Volatility / uncertainty spike.",
    x: 1.15,
    y: -0.75,
  },
];

export const EDGES: EdgeSpec[] = [
  {
    id: "u_to_income",
    from: "consumers_unemployment",
    to: "consumers_income",
    label: "Labor → income",
    typicalLag: 1,
    weight: 0.55,
  },
  {
    id: "income_to_demand",
    from: "consumers_income",
    to: "consumers_demand",
    label: "Income → demand",
    typicalLag: 1,
    weight: 0.45,
  },
  {
    id: "income_to_savings",
    from: "consumers_income",
    to: "consumers_savings",
    label: "Income → buffers",
    typicalLag: 2,
    weight: 0.35,
  },
  {
    id: "conf_to_demand",
    from: "consumers_confidence",
    to: "consumers_demand",
    label: "Sentiment → demand",
    typicalLag: 1,
    weight: 0.28,
  },
  {
    id: "income_to_delinquency",
    from: "consumers_income",
    to: "consumers_delinquency",
    label: "Income → delinquencies",
    typicalLag: 2,
    weight: 0.52,
  },
  {
    id: "access_to_delinquency",
    from: "credit_access",
    to: "consumers_delinquency",
    label: "Access → delinquencies",
    typicalLag: 1,
    weight: 0.25,
  },
  {
    id: "cost_to_delinquency",
    from: "credit_borrow_cost",
    to: "consumers_delinquency",
    label: "Costs → delinquencies",
    typicalLag: 1,
    weight: 0.18,
  },
  {
    id: "delinq_to_losses",
    from: "consumers_delinquency",
    to: "credit_bank_losses",
    label: "Delinquencies → losses",
    typicalLag: 2,
    weight: 0.62,
  },
  {
    id: "losses_to_capital",
    from: "credit_bank_losses",
    to: "credit_bank_capital",
    label: "Losses → capital",
    typicalLag: 1,
    weight: 0.55,
  },
  {
    id: "capital_to_standards",
    from: "credit_bank_capital",
    to: "credit_standards",
    label: "Capital → standards",
    typicalLag: 2,
    weight: 0.58,
  },
  {
    id: "liq_to_standards",
    from: "markets_liquidity",
    to: "credit_standards",
    label: "Liquidity → standards",
    typicalLag: 1,
    weight: 0.42,
  },
  {
    id: "standards_to_access",
    from: "credit_standards",
    to: "credit_access",
    label: "Standards → access",
    typicalLag: 1,
    weight: 0.62,
  },
  {
    id: "liq_to_cost",
    from: "markets_liquidity",
    to: "credit_borrow_cost",
    label: "Liquidity → costs",
    typicalLag: 1,
    weight: 0.55,
  },
  {
    id: "risk_to_liq",
    from: "markets_risk",
    to: "markets_liquidity",
    label: "Risk → liquidity",
    typicalLag: 1,
    weight: 0.62,
  },
  {
    id: "vol_to_liq",
    from: "markets_volatility",
    to: "markets_liquidity",
    label: "Vol → liquidity",
    typicalLag: 1,
    weight: 0.42,
  },
  {
    id: "losses_to_risk",
    from: "credit_bank_losses",
    to: "markets_risk",
    label: "Losses → risk",
    typicalLag: 2,
    weight: 0.34,
  },
  {
    id: "risk_to_conf",
    from: "markets_risk",
    to: "consumers_confidence",
    label: "Risk → confidence",
    typicalLag: 2,
    weight: 0.34,
  },
  {
    id: "conf_to_vol",
    from: "consumers_confidence",
    to: "markets_volatility",
    label: "Confidence → volatility",
    typicalLag: 2,
    weight: 0.25,
  },
  {
    id: "cost_to_demand",
    from: "credit_borrow_cost",
    to: "consumers_demand",
    label: "Costs → demand",
    typicalLag: 1,
    weight: 0.20,
  },
];



