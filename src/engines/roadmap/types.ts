export type RoadmapPriority = "critical" | "high" | "medium" | "low";

export interface QuestionTrigger {
  type: "question";
  questionId: string;
  /** Fires when the normalized answer (0-1) is strictly below this. */
  belowNorm: number;
}

export interface CategoryTrigger {
  type: "category";
  categoryId: string;
  /** Fires when the category score (0-100) is strictly below this. */
  belowScore: number;
}

export interface RoadmapRule {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: RoadmapPriority;
  estimatedWeeks: number;
  trigger: QuestionTrigger | CategoryTrigger;
}

export interface RoadmapRules {
  version: string;
  note: string;
  rules: RoadmapRule[];
}

/** One generated roadmap step, ready to persist. */
export interface RoadmapItemSpec {
  ruleId: string;
  title: string;
  description: string;
  categoryId: string;
  priority: RoadmapPriority;
  estimatedWeeks: number;
  /** Position in the ordered plan (0-based). */
  sortOrder: number;
}
