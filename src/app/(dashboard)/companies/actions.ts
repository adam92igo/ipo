"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/lib/data-access/context";
import { createCompany } from "@/lib/data-access/companies";
import { CompanyAlreadyExistsError, ForbiddenError } from "@/lib/data-access/errors";
import { verifySirenAtPappers } from "@/lib/ai/pappers";
import { companyInputSchema } from "@/lib/validation/company";

export interface CreateCompanyState {
  ok: boolean;
  error?: string;
  warning?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createCompanyAction(
  _prev: CreateCompanyState,
  formData: FormData,
): Promise<CreateCompanyState> {
  const parsed = companyInputSchema.safeParse({
    name: formData.get("name"),
    sector: formData.get("sector"),
    country: formData.get("country") || "FR",
    website: formData.get("website") ?? "",
    siren: formData.get("siren") ?? "",
    headcount: formData.get("headcount") || undefined,
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return { ok: false, fieldErrors: flat.fieldErrors as Record<string, string[]> };
  }

  let warning: string | undefined;
  if (parsed.data.siren) {
    const verification = await verifySirenAtPappers(parsed.data.siren);
    if (verification === "not_found") {
      return {
        ok: false,
        fieldErrors: { siren: ["This SIREN was not found in the French business registry."] },
      };
    }
    if (verification === "unreachable") {
      warning = "Could not verify the SIREN against the French business registry right now.";
    }
  }

  try {
    const ctx = await requireOrgContext();
    await createCompany(ctx, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: "Only owners and admins can add a company." };
    }
    if (error instanceof CompanyAlreadyExistsError) {
      return { ok: false, error: "This organization already has a company." };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  revalidatePath("/companies");
  revalidatePath("/dashboard");
  return { ok: true, warning };
}
