"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AiNotConfiguredError } from "@/lib/ai/config";
import {
  prefillAssessmentAnswers,
  type AssessmentPrefillSuggestion,
} from "@/lib/ai/assessment-prefill";
import { aiProviderErrorMessage } from "@/lib/ai/errors";
import { AI_RATE_LIMITS } from "@/lib/ai/rate-limit-config";
import { actionErrorMessage } from "@/lib/data-access/action-errors";
import {
  completeAssessment,
  getAnswersFor,
  getOrCreateActiveAssessment,
  saveAnswer,
} from "@/lib/data-access/assessments";
import { getCompany } from "@/lib/data-access/companies";
import { requireOrgContext } from "@/lib/data-access/context";
import { checkAndRecordAiUsage } from "@/lib/data-access/rate-limit";
import { getQuestionnaire } from "@/lib/questionnaire";

const startInput = z.object({
  companyId: z.string().min(1).max(64),
});

/**
 * Assessment rows are created HERE (a POST), never as a render side effect —
 * link prefetches and crawler GETs must not mint database rows.
 */
export async function startAssessmentAction(
  input: z.infer<typeof startInput>,
): Promise<{ ok: boolean; assessmentId?: string; error?: string }> {
  const parsed = startInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payload." };

  try {
    const ctx = await requireOrgContext();
    const assessment = await getOrCreateActiveAssessment(ctx, parsed.data.companyId);
    revalidatePath("/companies");
    return { ok: true, assessmentId: assessment.id };
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error) };
  }
}

const saveAnswerInput = z.object({
  assessmentId: z.string().min(1).max(64),
  questionId: z.string().min(1).max(64),
  // Shape check only — the scoring engine enforces per-question validity.
  value: z.union([
    z.boolean(),
    z.number().int().min(0).max(4),
    z.string().min(1).max(100),
  ]),
});

export async function saveAnswerAction(
  input: z.infer<typeof saveAnswerInput>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = saveAnswerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid answer payload." };

  try {
    const ctx = await requireOrgContext();
    await saveAnswer(
      ctx,
      parsed.data.assessmentId,
      parsed.data.questionId,
      parsed.data.value,
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error) };
  }
}

const prefillInput = z.object({
  companyId: z.string().min(1).max(64),
});

export async function prefillAssessmentAction(
  input: z.infer<typeof prefillInput>,
): Promise<{
  ok: boolean;
  suggestions?: AssessmentPrefillSuggestion[];
  usedRegistry?: boolean;
  usedWebsite?: boolean;
  error?: string;
}> {
  const parsed = prefillInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payload." };

  try {
    const ctx = await requireOrgContext();
    await checkAndRecordAiUsage(ctx, {
      feature: "prefill_assessment",
      cost: 1,
      now: new Date(),
      ...AI_RATE_LIMITS.prefillAssessment,
    });
    const company = await getCompany(ctx, parsed.data.companyId);
    const assessment = await getOrCreateActiveAssessment(ctx, company.id, company);
    const answers = await getAnswersFor(ctx, assessment);
    const questionnaire = getQuestionnaire(assessment.questionnaireVersion);
    const result = await prefillAssessmentAnswers({
      company: {
        name: company.name,
        sector: company.sector,
        website: company.website,
        siren: company.siren,
        headcount: company.headcount,
      },
      questionnaire,
      answers,
    });
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof AiNotConfiguredError) return { ok: false, error: error.message };
    const providerError = aiProviderErrorMessage(error);
    if (providerError) return { ok: false, error: providerError };
    return { ok: false, error: actionErrorMessage(error) };
  }
}

const completeInput = z.object({
  assessmentId: z.string().min(1).max(64),
});

export async function completeAssessmentAction(
  input: z.infer<typeof completeInput>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = completeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payload." };

  try {
    const ctx = await requireOrgContext();
    await completeAssessment(ctx, parsed.data.assessmentId);
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error) };
  }

  // Deliberately NOT revalidating the assessment subtree: re-rendering the
  // form page mid-navigation serves no one; results loads fresh data anyway.
  revalidatePath("/companies");
  revalidatePath("/dashboard");
  return { ok: true };
}
