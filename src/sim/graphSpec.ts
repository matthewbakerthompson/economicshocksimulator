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
  /** What the channel does, as a sentence fragment ("Missed payments become loan losses"). */
  label: string;
  typicalLag: number; // steps (months)
  weight: number; // 0..1-ish
};

// x and y are from the first prototype; the network view lays nodes out in src/ui/networkLayout.ts.
export const NODES: NodeSpec[] = [
  {
    id: "consumers_unemployment",
    layer: "Consumers",
    label: "Unemployment",
    description: "People out of work. Unemployment shocks enter here.",
    x: -1.2,
    y: 0.55,
  },
  {
    id: "consumers_income",
    layer: "Consumers",
    label: "Income squeeze",
    description: "Household incomes falling or becoming less secure.",
    x: -1.35,
    y: 0.05,
  },
  {
    id: "consumers_confidence",
    layer: "Consumers",
    label: "Confidence loss",
    description: "Households and businesses losing confidence.",
    x: -1.05,
    y: -0.15,
  },
  {
    id: "consumers_savings",
    layer: "Consumers",
    label: "Savings drawdown",
    description: "Households running down their savings.",
    x: -1.55,
    y: -0.55,
  },
  {
    id: "consumers_demand",
    layer: "Consumers",
    label: "Weak demand",
    description: "People and firms spending less.",
    x: -1.1,
    y: -0.75,
  },
  {
    id: "consumers_delinquency",
    layer: "Consumers",
    label: "Missed payments",
    description: "Borrowers falling behind on loans.",
    x: -1.45,
    y: -0.25,
  },
  {
    id: "credit_bank_losses",
    layer: "Credit",
    label: "Loan losses",
    description: "Banks writing off loans that will not be repaid.",
    x: 0.0,
    y: 0.3,
  },
  {
    id: "credit_bank_capital",
    layer: "Credit",
    label: "Capital strain",
    description: "Losses eating into the capital that cushions banks.",
    x: -0.05,
    y: -0.1,
  },
  {
    id: "credit_standards",
    layer: "Credit",
    label: "Tighter lending",
    description: "Banks asking more of borrowers before they lend.",
    x: 0.15,
    y: -0.55,
  },
  {
    id: "credit_access",
    layer: "Credit",
    label: "Credit squeeze",
    description: "Borrowers finding it harder to get or refinance loans.",
    x: 0.05,
    y: -0.85,
  },
  {
    id: "credit_borrow_cost",
    layer: "Credit",
    label: "Borrowing costs",
    description: "The interest rates and spreads borrowers pay.",
    x: 0.35,
    y: -0.25,
  },
  {
    id: "markets_risk",
    layer: "Markets",
    label: "Risk aversion",
    description: "Investors pulling back from risk.",
    x: 1.25,
    y: 0.2,
  },
  {
    id: "markets_liquidity",
    layer: "Markets",
    label: "Liquidity strain",
    description: "Funding markets drying up.",
    x: 1.4,
    y: -0.25,
  },
  {
    id: "markets_volatility",
    layer: "Markets",
    label: "Volatility",
    description: "How sharply and unpredictably market prices move.",
    x: 1.15,
    y: -0.75,
  },
];

export const EDGES: EdgeSpec[] = [
  {
    id: "u_to_income",
    from: "consumers_unemployment",
    to: "consumers_income",
    label: "Job losses cut incomes",
    typicalLag: 1,
    weight: 0.55,
  },
  {
    id: "income_to_demand",
    from: "consumers_income",
    to: "consumers_demand",
    label: "Lower incomes cut spending",
    typicalLag: 1,
    weight: 0.45,
  },
  {
    id: "income_to_savings",
    from: "consumers_income",
    to: "consumers_savings",
    label: "Lower incomes draw down savings",
    typicalLag: 2,
    weight: 0.35,
  },
  {
    id: "conf_to_demand",
    from: "consumers_confidence",
    to: "consumers_demand",
    label: "Lower confidence cuts spending",
    typicalLag: 1,
    weight: 0.28,
  },
  {
    id: "income_to_delinquency",
    from: "consumers_income",
    to: "consumers_delinquency",
    label: "Lower incomes cause missed payments",
    typicalLag: 2,
    weight: 0.52,
  },
  {
    id: "access_to_delinquency",
    from: "credit_access",
    to: "consumers_delinquency",
    label: "Tight credit stops borrowers refinancing",
    typicalLag: 1,
    weight: 0.25,
  },
  {
    id: "cost_to_delinquency",
    from: "credit_borrow_cost",
    to: "consumers_delinquency",
    label: "Higher borrowing costs cause missed payments",
    typicalLag: 1,
    weight: 0.18,
  },
  {
    id: "delinq_to_losses",
    from: "consumers_delinquency",
    to: "credit_bank_losses",
    label: "Missed payments become loan losses",
    typicalLag: 2,
    weight: 0.62,
  },
  {
    id: "losses_to_capital",
    from: "credit_bank_losses",
    to: "credit_bank_capital",
    label: "Losses eat into capital",
    typicalLag: 1,
    weight: 0.55,
  },
  {
    id: "capital_to_standards",
    from: "credit_bank_capital",
    to: "credit_standards",
    label: "Lower capital makes banks tighten lending",
    typicalLag: 2,
    weight: 0.58,
  },
  {
    id: "liq_to_standards",
    from: "markets_liquidity",
    to: "credit_standards",
    label: "Funding strain makes banks tighten lending",
    typicalLag: 1,
    weight: 0.42,
  },
  {
    id: "standards_to_access",
    from: "credit_standards",
    to: "credit_access",
    label: "Tighter standards squeeze credit",
    typicalLag: 1,
    weight: 0.62,
  },
  {
    id: "liq_to_cost",
    from: "markets_liquidity",
    to: "credit_borrow_cost",
    label: "Funding strain raises borrowing costs",
    typicalLag: 1,
    weight: 0.55,
  },
  {
    id: "risk_to_liq",
    from: "markets_risk",
    to: "markets_liquidity",
    label: "Risk aversion drains liquidity",
    typicalLag: 1,
    weight: 0.62,
  },
  {
    id: "vol_to_liq",
    from: "markets_volatility",
    to: "markets_liquidity",
    label: "Volatility drains liquidity",
    typicalLag: 1,
    weight: 0.42,
  },
  {
    id: "losses_to_risk",
    from: "credit_bank_losses",
    to: "markets_risk",
    label: "Bank losses make investors pull back",
    typicalLag: 2,
    weight: 0.34,
  },
  {
    id: "risk_to_conf",
    from: "markets_risk",
    to: "consumers_confidence",
    label: "Investor fear lowers confidence",
    typicalLag: 2,
    weight: 0.34,
  },
  {
    id: "conf_to_vol",
    from: "consumers_confidence",
    to: "markets_volatility",
    label: "Lower confidence unsettles markets",
    typicalLag: 2,
    weight: 0.25,
  },
  {
    id: "cost_to_demand",
    from: "credit_borrow_cost",
    to: "consumers_demand",
    label: "Higher borrowing costs cut spending",
    typicalLag: 1,
    weight: 0.20,
  },
];

/**
 * The two channels that close every loop in the graph: bank losses unsettling investors, and
 * borrowers who can't refinance missing payments. Without them the graph has no cycles, so
 * rerunning a scenario without them measures how much the feedback adds.
 */
export const FEEDBACK_EDGES: readonly string[] = ["losses_to_risk", "access_to_delinquency"];
