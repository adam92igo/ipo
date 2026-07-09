import { z } from "zod";
import type { Question, Questionnaire } from "@/engines/scoring/types";
import questionnaireV1 from "../../config/questionnaire.v1.json";
import { createVersionedConfig } from "./versioned-config";

const choiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.number().min(0).max(1),
});

const questionSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    type: z.enum(["yes_no", "scale_0_4", "single_choice"]),
    weight: z.number().positive(),
    actionLabel: z.string().min(1).optional(),
    choices: z.array(choiceSchema).min(2).optional(),
  })
  .refine((q) => (q.type === "single_choice") === (q.choices !== undefined), {
    message: "choices are required for single_choice questions and forbidden otherwise",
  });

export const questionnaireSchema = z
  .object({
    version: z.string().min(1),
    /** Answer-option wording for scale_0_4 questions — versioned content. */
    scaleLabels: z.array(z.string().min(1)).length(5),
    thresholds: z.object({
      strength: z.number().min(0).max(100),
      weakness: z.number().min(0).max(100),
    }),
    categories: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          weight: z.number().positive(),
          questions: z.array(questionSchema).min(1),
        }),
      )
      .min(1),
  })
  .refine((qn) => qn.thresholds.weakness <= qn.thresholds.strength, {
    message: "weakness threshold must not exceed strength threshold",
  })
  .refine(
    (qn) => {
      const ids = qn.categories.flatMap((c) => c.questions.map((q) => q.id));
      return new Set(ids).size === ids.length;
    },
    { message: "question ids must be unique across the questionnaire" },
  );

export const CURRENT_QUESTIONNAIRE_VERSION = "v1";

const questionIndexCache = new Map<string, Map<string, Question>>();

/** Parses and validates a versioned questionnaire config. Throws on unknown version or invalid content. */
export const getQuestionnaire = createVersionedConfig<Questionnaire>(
  "questionnaire",
  { v1: questionnaireV1 },
  questionnaireSchema,
);

/** O(1) question lookup by id for a given version. */
export function getQuestionIndex(version: string): Map<string, Question> {
  const cached = questionIndexCache.get(version);
  if (cached) return cached;
  const index = new Map(
    getQuestionnaire(version).categories.flatMap((c) =>
      c.questions.map((q) => [q.id, q] as const),
    ),
  );
  questionIndexCache.set(version, index);
  return index;
}
