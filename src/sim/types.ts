export type NodeId =
  | "consumers_unemployment"
  | "consumers_income"
  | "consumers_confidence"
  | "consumers_savings"
  | "consumers_demand"
  | "consumers_delinquency"
  | "credit_bank_losses"
  | "credit_bank_capital"
  | "credit_standards"
  | "credit_access"
  | "credit_borrow_cost"
  | "markets_risk"
  | "markets_liquidity"
  | "markets_volatility";

export type LayerId = "Consumers" | "Credit" | "Markets";

export type EventType = "unemployment" | "stagflation" | "oil_glut";

export type LagPreset = "short" | "medium" | "long";
export type BufferPreset = "low" | "medium" | "high";

export type CausalEvent = {
  id: string;
  type: EventType;
  /**
   * Magnitude semantics depend on event type:
   * - unemployment: percentage points (0..6 typical)
   * - stagflation: severity (0..1)
   * - oil_glut: severity (0..1)
   */
  magnitude: number;
  startStep: number;
  durationSteps: number;
};

export type Scenario = {
  events: CausalEvent[];
  lagPreset: LagPreset;
  bufferPreset: BufferPreset;
};

export type ReceiptItem = {
  label: string;
  amount: number;
  kind: "shock" | "edge" | "dampener" | "clamp";
  meta?: Record<string, string | number | boolean>;
};

export type NodeReceipt = {
  nodeId: NodeId;
  items: ReceiptItem[];
};

export type SimulationResult = {
  steps: number;
  nodeIds: NodeId[];
  seriesByNode: Record<NodeId, number[]>;
  receiptsByNodeByStep: Record<NodeId, NodeReceipt[]>;
};

export function defaultScenario(): Scenario {
  return {
    events: [
      {
        id: "ev_unemployment_1",
        type: "unemployment",
        magnitude: 1.0,
        startStep: 1,
        durationSteps: 4,
      },
    ],
    lagPreset: "medium",
    bufferPreset: "medium",
  };
}


