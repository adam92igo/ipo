import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NotApplicableError } from "@/engines/valuation";
import { migrateTestDb, seedOrgWithUser, truncateAll } from "../../test/db";
import { createCompany } from "./companies";
import { ForbiddenError, NotFoundError } from "./errors";
import {
  deleteFinancialYear,
  listFinancials,
  upsertFinancialYear,
} from "./financials";
import { getLatestValuationRun, runValuation } from "./valuations";

async function seedCompany(role: "owner" | "admin" | "member" = "owner") {
  const ctx = await seedOrgWithUser(role);
  const company = await createCompany(
    { ...ctx, role: "owner" },
    { name: "Acme SAS", sector: "Software", country: "FR" },
  );
  return { ctx, company };
}

const year2025 = {
  fiscalYear: 2025,
  revenue: 12_500_000,
  ebitda: 1_500_000,
  netIncome: 700_000,
  netDebt: 1_000_000,
  freeCashFlow: 600_000,
};

describe("financials + valuation data-access", () => {
  beforeAll(async () => {
    await migrateTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  it("upserts one row per fiscal year, scoped to the org", async () => {
    const { ctx, company } = await seedCompany();
    await upsertFinancialYear(ctx, company.id, year2025);
    await upsertFinancialYear(ctx, company.id, { ...year2025, revenue: 13_000_000 });

    const rows = await listFinancials(ctx, company.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].revenue).toBe(13_000_000);
    expect(rows[0].fiscalYear).toBe(2025);
  });

  it("refuses cross-org reads and writes", async () => {
    const { ctx, company } = await seedCompany();
    await upsertFinancialYear(ctx, company.id, year2025);
    const other = await seedOrgWithUser("owner");

    await expect(listFinancials(other, company.id)).rejects.toThrow(NotFoundError);
    await expect(upsertFinancialYear(other, company.id, year2025)).rejects.toThrow(
      NotFoundError,
    );
    await expect(deleteFinancialYear(other, company.id, 2025)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("blocks members from writing financials but lets them read", async () => {
    const { ctx, company } = await seedCompany();
    await upsertFinancialYear(ctx, company.id, year2025);
    const memberCtx = { ...ctx, role: "member" as const };

    await expect(
      upsertFinancialYear(memberCtx, company.id, { ...year2025, fiscalYear: 2024 }),
    ).rejects.toThrow(ForbiddenError);
    await expect(listFinancials(memberCtx, company.id)).resolves.toHaveLength(1);
  });

  it("runs a valuation, persists inputs/results with the refs version, and reads it back", async () => {
    const { ctx, company } = await seedCompany();
    await upsertFinancialYear(ctx, company.id, {
      fiscalYear: 2023,
      revenue: 8_000_000,
      ebitda: 800_000,
      netIncome: 300_000,
      netDebt: 900_000,
      freeCashFlow: 350_000,
    });
    await upsertFinancialYear(ctx, company.id, year2025);

    const run = await runValuation(ctx, company.id);
    expect(run.organizationId).toBe(ctx.organizationId);
    expect(run.refsVersion).toBe("v1");

    const results = run.results as {
      aggregated: { low: number; mid: number; high: number; methodsUsed: string[] };
    };
    expect(results.aggregated.methodsUsed).toEqual([
      "dcf",
      "comparables",
      "market_multiples",
    ]);
    expect(results.aggregated.low).toBeGreaterThan(0);
    expect(results.aggregated.high).toBeGreaterThan(results.aggregated.low);

    const latest = await getLatestValuationRun(ctx, company.id);
    expect(latest?.id).toBe(run.id);
  });

  it("propagates NotApplicableError when no financials exist", async () => {
    const { ctx, company } = await seedCompany();
    await expect(runValuation(ctx, company.id)).rejects.toThrow(NotApplicableError);
  });

  it("refuses cross-org valuation runs", async () => {
    const { ctx, company } = await seedCompany();
    await upsertFinancialYear(ctx, company.id, year2025);
    const other = await seedOrgWithUser("owner");
    await expect(runValuation(other, company.id)).rejects.toThrow(NotFoundError);
    await expect(getLatestValuationRun(other, company.id)).rejects.toThrow(
      NotFoundError,
    );
  });
});
