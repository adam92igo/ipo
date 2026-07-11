export type TrajectoryStageId =
  | "foundation"
  | "financial_control"
  | "governance"
  | "equity_story"
  | "market_ready";

export type TrajectoryStageState = "completed" | "current" | "future";

export interface TrajectoryStage {
  id: TrajectoryStageId;
  label: string;
  state: TrajectoryStageState;
}

const STAGES: Array<{ id: TrajectoryStageId; label: string; minimum: number }> = [
  { id: "foundation", label: "Foundation", minimum: 0 },
  { id: "financial_control", label: "Financial control", minimum: 40 },
  { id: "governance", label: "Governance", minimum: 60 },
  { id: "equity_story", label: "Equity story", minimum: 75 },
  { id: "market_ready", label: "Market ready", minimum: 90 },
];

export function deriveMarketTrajectory(globalScore: number | null) {
  const score = Math.max(0, Math.min(100, globalScore ?? 0));
  const currentIndex = STAGES.reduce(
    (selected, stage, index) => (score >= stage.minimum ? index : selected),
    0,
  );
  const stages: TrajectoryStage[] = STAGES.map((stage, index) => ({
    id: stage.id,
    label: stage.label,
    state: index < currentIndex ? "completed" : index === currentIndex ? "current" : "future",
  }));
  return { current: stages[currentIndex], stages };
}

export type AssessmentSnapshotState =
  | { kind: "missing" }
  | { kind: "unavailable"; reason: "incomplete_snapshot" }
  | { kind: "in_progress"; answered: number; total: number }
  | {
      kind: "available";
      score: number;
      completedAt: Date;
      questionnaireVersion: string;
      categoryScores: Record<string, number>;
    };

export type ValuationSnapshotState =
  | { kind: "missing_financials" }
  | { kind: "ready_to_run" }
  | {
      kind: "available";
      low: number;
      mid: number;
      high: number;
      methodCount: number;
      refsVersion: string;
      createdAt: Date;
    };

export function valuationState(
  financialYearCount: number,
  available: Extract<ValuationSnapshotState, { kind: "available" }> | null,
): ValuationSnapshotState {
  if (available) return available;
  return financialYearCount === 0 ? { kind: "missing_financials" } : { kind: "ready_to_run" };
}
