"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionErrorMessage } from "@/lib/data-access/action-errors";
import { requireOrgContext } from "@/lib/data-access/context";
import {
  deleteFinancialYear,
  upsertFinancialYear,
} from "@/lib/data-access/financials";
import { runValuation } from "@/lib/data-access/valuations";
import { financialYearSchema } from "@/lib/validation/financials";

const companyIdSchema = z.string().min(1).max(64);

export interface FinancialsActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function saveFinancialYearAction(
  companyId: string,
  _prev: FinancialsActionState,
  formData: FormData,
): Promise<FinancialsActionState> {
  const id = companyIdSchema.safeParse(companyId);
  if (!id.success) return { ok: false, error: "Invalid company." };

  const readAmount = (name: string) => {
    const raw = formData.get(name);
    return raw === null || raw === "" ? null : raw;
  };
  const parsed = financialYearSchema.safeParse({
    fiscalYear: formData.get("fiscalYear"),
    revenue: readAmount("revenue"),
    ebitda: readAmount("ebitda"),
    netIncome: readAmount("netIncome"),
    netDebt: readAmount("netDebt"),
    freeCashFlow: readAmount("freeCashFlow"),
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      ok: false,
      error: flat.formErrors[0],
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const ctx = await requireOrgContext();
    await upsertFinancialYear(ctx, id.data, parsed.data);
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error) };
  }

  revalidatePath(`/companies/${id.data}/valuation`);
  return { ok: true };
}

export async function deleteFinancialYearAction(input: {
  companyId: string;
  fiscalYear: number;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = z
    .object({ companyId: companyIdSchema, fiscalYear: z.number().int() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payload." };

  try {
    const ctx = await requireOrgContext();
    await deleteFinancialYear(ctx, parsed.data.companyId, parsed.data.fiscalYear);
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error) };
  }

  revalidatePath(`/companies/${parsed.data.companyId}/valuation`);
  return { ok: true };
}

export async function runValuationAction(input: {
  companyId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.object({ companyId: companyIdSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payload." };

  try {
    const ctx = await requireOrgContext();
    await runValuation(ctx, parsed.data.companyId);
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error) };
  }

  revalidatePath(`/companies/${parsed.data.companyId}/valuation`);
  return { ok: true };
}
