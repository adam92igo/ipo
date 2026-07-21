import { and, eq } from "drizzle-orm";
import {
  computeSharePrice,
  InvalidShareInputError,
  type SharePriceResult,
} from "@/engines/share-price";
import { db } from "../../db";
import { companyShareStructure } from "../../db/schema";
import type { ShareStructureInput } from "../validation/share-structure";
import { getCompany, type Company } from "./companies";
import { assertRole, type OrgContext } from "./org-context";
import {
  getLatestValuationRunFor,
  type ValuationRunResults,
} from "./valuations";

export interface ShareStructure {
  existingShares: number;
  newShares: number;
}

const toNumber = (v: string): number => Number(v);

/** Share structure for a company (tenant-scoped), or null if never set. */
export async function getShareStructureFor(
  ctx: OrgContext,
  company: Company,
): Promise<ShareStructure | null> {
  const rows = await db
    .select()
    .from(companyShareStructure)
    .where(
      and(
        eq(companyShareStructure.companyId, company.id),
        eq(companyShareStructure.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    existingShares: toNumber(row.existingShares),
    newShares: toNumber(row.newShares),
  };
}

/** Upsert the share structure (one row per company). Owner/admin only. */
export async function upsertShareStructure(
  ctx: OrgContext,
  companyId: string,
  input: ShareStructureInput,
): Promise<void> {
  assertRole(ctx, ["owner", "admin"]);
  await getCompany(ctx, companyId); // proves org ownership

  await db
    .insert(companyShareStructure)
    .values({
      organizationId: ctx.organizationId,
      companyId,
      existingShares: String(input.existingShares),
      newShares: String(input.newShares),
    })
    .onConflictDoUpdate({
      target: [companyShareStructure.companyId],
      set: {
        existingShares: String(input.existingShares),
        newShares: String(input.newShares),
        updatedAt: new Date(),
      },
    });
}

export interface CompanySharePrice {
  structure: ShareStructure;
  result: SharePriceResult;
}

/**
 * Assembles the indicative share price: latest valuation equity range ÷ the
 * stored share structure. Returns null when either the valuation or the share
 * structure is missing (the UI then prompts for what's needed).
 */
export async function getCompanySharePriceFor(
  ctx: OrgContext,
  company: Company,
): Promise<CompanySharePrice | null> {
  const [structure, valuationRun] = await Promise.all([
    getShareStructureFor(ctx, company),
    getLatestValuationRunFor(ctx, company),
  ]);
  if (!structure || !valuationRun) return null;

  const { aggregated } = valuationRun.results as ValuationRunResults;
  try {
    const result = computeSharePrice({
      equity: {
        low: aggregated.low,
        mid: aggregated.mid,
        high: aggregated.high,
      },
      existingShares: structure.existingShares,
      newShares: structure.newShares,
    });
    return { structure, result };
  } catch (error) {
    if (error instanceof InvalidShareInputError) return null;
    throw error;
  }
}
