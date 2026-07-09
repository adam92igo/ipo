"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionErrorMessage } from "@/lib/data-access/action-errors";
import {
  completeAssessment,
  getOrCreateActiveAssessment,
  saveAnswer,
} from "@/lib/data-access/assessments";
import { requireOrgContext } from "@/lib/data-access/context";

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
