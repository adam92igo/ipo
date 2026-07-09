import { and, asc, eq } from "drizzle-orm";
import type { FinancialYear } from "@/engines/valuation/types";
import { db } from "../../db";
import { companyFinancials } from "../../db/schema";
import type { FinancialYearInput } from "../validation/financials";
import { getCompany } from "./companies";
import { NotFoundError } from "./errors";
import { assertRole, type OrgContext } from "./org-context";

const toNumber = (v: string | null): number | null => (v === null ? null : Number(v));
const toNumeric = (v: number | null | undefined): string | null =>
  v === null || v === undefined ? null : String(v);

/** Financial history in engine shape (numbers), oldest year first. */
export async function listFinancials(
  ctx: OrgContext,
  companyId: string,
): Promise<FinancialYear[]> {
  await getCompany(ctx, companyId); // proves org ownership
  const rows = await db
    .select()
    .from(companyFinancials)
    .where(
      and(
        eq(companyFinancials.companyId, companyId),
        eq(companyFinancials.organizationId, ctx.organizationId),
      ),
    )
    .orderBy(asc(companyFinancials.fiscalYear));
  return rows.map((r) => ({
    fiscalYear: r.fiscalYear,
    revenue: toNumber(r.revenue),
    ebitda: toNumber(r.ebitda),
    netIncome: toNumber(r.netIncome),
    netDebt: toNumber(r.netDebt),
    freeCashFlow: toNumber(r.freeCashFlow),
  }));
}

/** One row per (company, fiscal year); writing twice updates the year. */
export async function upsertFinancialYear(
  ctx: OrgContext,
  companyId: string,
  input: FinancialYearInput,
): Promise<void> {
  assertRole(ctx, ["owner", "admin"]);
  await getCompany(ctx, companyId);

  await db
    .insert(companyFinancials)
    .values({
      organizationId: ctx.organizationId,
      companyId,
      fiscalYear: input.fiscalYear,
      revenue: toNumeric(input.revenue),
      ebitda: toNumeric(input.ebitda),
      netIncome: toNumeric(input.netIncome),
      netDebt: toNumeric(input.netDebt),
      freeCashFlow: toNumeric(input.freeCashFlow),
    })
    .onConflictDoUpdate({
      target: [companyFinancials.companyId, companyFinancials.fiscalYear],
      set: {
        revenue: toNumeric(input.revenue),
        ebitda: toNumeric(input.ebitda),
        netIncome: toNumeric(input.netIncome),
        netDebt: toNumeric(input.netDebt),
        freeCashFlow: toNumeric(input.freeCashFlow),
        updatedAt: new Date(),
      },
    });
}

export async function deleteFinancialYear(
  ctx: OrgContext,
  companyId: string,
  fiscalYear: number,
): Promise<void> {
  assertRole(ctx, ["owner", "admin"]);
  await getCompany(ctx, companyId);

  const deleted = await db
    .delete(companyFinancials)
    .where(
      and(
        eq(companyFinancials.companyId, companyId),
        eq(companyFinancials.organizationId, ctx.organizationId),
        eq(companyFinancials.fiscalYear, fiscalYear),
      ),
    )
    .returning({ id: companyFinancials.id });
  if (!deleted[0]) throw new NotFoundError("Financial year");
}
