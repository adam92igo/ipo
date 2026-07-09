export type QuestionType = "yes_no" | "scale_0_4" | "single_choice";

export interface Choice {
  id: string;
  label: string;
  /** Normalized contribution of this choice, in [0, 1]. */
  value: number;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  /** Relative importance of the question inside its category (> 0). */
  weight: number;
  /** Restitution copy used when this question drags the score down. */
  actionLabel?: string;
  choices?: Choice[];
}

export interface Category {
  id: string;
  label: string;
  /** Relative importance of the category in the global score (> 0). */
  weight: number;
  questions: Question[];
}

export interface Questionnaire {
  version: string;
  /** Wording of the five scale_0_4 answer options (index = scale value). */
  scaleLabels: string[];
  thresholds: {
    /** Category score (0-100) at or above which it counts as a strength. */
    strength: number;
    /** Category score (0-100) strictly below which it counts as a weakness. */
    weakness: number;
  };
  categories: Category[];
}

/** yes_no -> boolean; scale_0_4 -> integer 0..4; single_choice -> choice id. */
export type AnswerValue = boolean | number | string;

export type Answers = Record<string, AnswerValue>;

export interface CategoryScore {
  id: string;
  label: string;
  /** 0-100, rounded to 1 decimal. */
  score: number;
}

export interface ScoreResult {
  version: string;
  /** 0-100, rounded to 1 decimal. */
  global: number;
  categories: CategoryScore[];
}

export interface PriorityAction {
  questionId: string;
  categoryId: string;
  actionLabel: string;
  /** weight x (1 - normalized answer): how much this question drags the score. */
  impact: number;
}

export interface Restitution {
  strengths: CategoryScore[];
  weaknesses: CategoryScore[];
  priorityActions: PriorityAction[];
}

export interface Progress {
  answered: number;
  total: number;
  byCategory: Array<{ id: string; answered: number; total: number }>;
}
