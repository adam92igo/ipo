import { z } from "zod";
import type { RoadmapRules } from "@/engines/roadmap/types";
import roadmapRulesV1 from "../../config/roadmap-rules.v1.json";
import { createVersionedConfig } from "./versioned-config";

const triggerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("question"),
    questionId: z.string().min(1),
    belowNorm: z.number().gt(0).max(1),
  }),
  z.object({
    type: z.literal("category"),
    categoryId: z.string().min(1),
    belowScore: z.number().gt(0).max(100),
  }),
]);

export const roadmapRulesSchema = z
  .object({
    version: z.string().min(1),
    note: z.string(),
    rules: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.string().min(1),
          description: z.string().min(1),
          category: z.string().min(1),
          priority: z.enum(["critical", "high", "medium", "low"]),
          estimatedWeeks: z.number().int().positive().max(200),
          trigger: triggerSchema,
        }),
      )
      .min(1),
  })
  .refine(
    (config) => {
      const ids = config.rules.map((r) => r.id);
      return new Set(ids).size === ids.length;
    },
    { message: "rule ids must be unique" },
  );

export const CURRENT_ROADMAP_RULES_VERSION = "v1";

export const getRoadmapRules = createVersionedConfig<RoadmapRules>(
  "roadmap rules",
  { v1: roadmapRulesV1 },
  roadmapRulesSchema,
);
