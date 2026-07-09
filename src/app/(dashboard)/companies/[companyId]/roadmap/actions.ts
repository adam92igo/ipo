"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionErrorMessage } from "@/lib/data-access/action-errors";
import { requireOrgContext } from "@/lib/data-access/context";
import {
  generateRoadmapForAssessment,
  updateRoadmapItemStatus,
} from "@/lib/data-access/roadmap";

const generateInput = z.object({
  assessmentId: z.string().min(1).max(64),
  companyId: z.string().min(1).max(64),
});

export async function generateRoadmapAction(
  input: z.infer<typeof generateInput>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = generateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payload." };

  try {
    const ctx = await requireOrgContext();
    await generateRoadmapForAssessment(ctx, parsed.data.assessmentId);
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error) };
  }

  revalidatePath(`/companies/${parsed.data.companyId}/roadmap`);
  return { ok: true };
}

const statusInput = z.object({
  itemId: z.string().min(1).max(64),
  status: z.enum(["todo", "in_progress", "done"]),
  companyId: z.string().min(1).max(64),
});

export async function updateRoadmapItemStatusAction(
  input: z.infer<typeof statusInput>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = statusInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payload." };

  try {
    const ctx = await requireOrgContext();
    await updateRoadmapItemStatus(ctx, parsed.data.itemId, parsed.data.status);
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error) };
  }

  revalidatePath(`/companies/${parsed.data.companyId}/roadmap`);
  return { ok: true };
}
