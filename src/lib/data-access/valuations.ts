import { and, desc, eq } from "drizzle-orm";
import { prepareValuation, type PreparedValuation } from "@/engines/valuation";
import { db } from "../../db";
import { valuationRun } from "../../db/schema";
import {
  CURRENT_VALUATION_REFS_VERSION,
  getValuationRefs,
} from "../valuation-refs";
import { getCompany } from "./companies";
import { listFinancials } from "./financials";
import type { OrgContext } from "./org-context";

export type ValuationRun = typeof valuationRun.$inferSelect;

export interface ValuationRunResults {
  sectorLabel: string;
  methods: PreparedValuation["methods"];
  aggregated: PreparedValuation["aggregated"];
  assumptions: string[];
}

/**
 * Snapshots the financial history, runs the deterministic engine against the
 * current refs version and persists inputs + results with that version.
 * All roles may run a valuation (like filling the diagnostic).
 */
export async function runValuation(
  ctx: OrgContext,
  companyId: string,
): Promise<ValuationRun> {
  const company = await getCompany(ctx, companyId);
  const financials = await listFinancials(ctx, companyId);
  const refs = getValuationRefs(CURRENT_VALUATION_REFS_VERSION);

  // Throws NotApplicableError when nothing usable exists — actions map it.
  const prepared = prepareValuation({ financials, sector: company.sector, refs });

  const results: ValuationRunResults = {
    sectorLabel: prepared.sector.label,
    methods: prepared.methods,
    aggregated: prepared.aggregated,
    assumptions: prepared.assumptions,
  };

  const [created] = await db
    .insert(valuationRun)
    .values({
      organizationId: ctx.organizationId,
      companyId,
      refsVersion: refs.version,
      inputs: { sector: company.sector, financials },
      results,
    })
    .returning();
  return created;
}

export async function getLatestValuationRun(
  ctx: OrgContext,
  companyId: string,
): Promise<ValuationRun | null> {
  await getCompany(ctx, companyId); // proves org ownership, 404s foreign ids
  const rows = await db
    .select()
    .from(valuationRun)
    .where(
      and(
        eq(valuationRun.companyId, companyId),
        eq(valuationRun.organizationId, ctx.organizationId),
      ),
    )
    .orderBy(desc(valuationRun.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
