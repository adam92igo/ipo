"use server";

import { z } from "zod";
import { AiNotConfiguredError } from "@/lib/ai/config";
import {
  fillCompanyProfile,
  type ProfileFillResult,
} from "@/lib/ai/profile-fill";
import { AI_RATE_LIMITS } from "@/lib/ai/rate-limit-config";
import { UnsafeUrlError } from "@/lib/ai/website";
import { requireOrgContext } from "@/lib/data-access/context";
import { actionErrorMessage } from "@/lib/data-access/action-errors";
import { checkAndRecordAiUsage } from "@/lib/data-access/rate-limit";

const fillInput = z.object({
  name: z.string().trim().min(2).max(200),
  website: z.union([z.url(), z.literal("")]).optional(),
});

export async function fillCompanyProfileAction(input: {
  name: string;
  website?: string;
}): Promise<{ ok: boolean; result?: ProfileFillResult; error?: string }> {
  const parsed = fillInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a company name (and optionally a valid URL) first." };
  }

  try {
    const ctx = await requireOrgContext(); // authenticated org members only — costs API credits
    await checkAndRecordAiUsage(ctx, {
      feature: "fill_profile",
      cost: 1,
      now: new Date(),
      ...AI_RATE_LIMITS.fillProfile,
    });
    const result = await fillCompanyProfile({
      name: parsed.data.name,
      website: parsed.data.website || null,
    });
    return { ok: true, result };
  } catch (error) {
    if (error instanceof AiNotConfiguredError) return { ok: false, error: error.message };
    if (error instanceof UnsafeUrlError) return { ok: false, error: error.message };
    return { ok: false, error: actionErrorMessage(error) };
  }
}
