import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { company } from "../../db/schema";
import type { CompanyInput } from "../validation/company";
import { CompanyAlreadyExistsError, NotFoundError } from "./errors";
import { assertRole, type OrgContext } from "./org-context";

export type Company = typeof company.$inferSelect;

/** An organization has at most one company — this is always a 0- or 1-element list. */
export async function listCompanies(ctx: OrgContext): Promise<Company[]> {
  return db
    .select()
    .from(company)
    .where(eq(company.organizationId, ctx.organizationId))
    .orderBy(desc(company.createdAt));
}

export async function getCompany(ctx: OrgContext, companyId: string): Promise<Company> {
  const rows = await db
    .select()
    .from(company)
    .where(and(eq(company.id, companyId), eq(company.organizationId, ctx.organizationId)))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Company");
  return rows[0];
}

/**
 * One company per organization — an org that already has one loses the race
 * to company_org_uq instead of silently creating a second row.
 */
export async function createCompany(ctx: OrgContext, input: CompanyInput): Promise<Company> {
  assertRole(ctx, ["owner", "admin"]);
  const [created] = await db
    .insert(company)
    .values({
      organizationId: ctx.organizationId,
      createdBy: ctx.userId,
      name: input.name,
      sector: input.sector,
      country: input.country,
      website: input.website || null,
      siren: input.siren || null,
      headcount: input.headcount ?? null,
    })
    .onConflictDoNothing({ target: company.organizationId })
    .returning();
  if (!created) throw new CompanyAlreadyExistsError();
  return created;
}

export async function updateCompany(
  ctx: OrgContext,
  companyId: string,
  input: CompanyInput,
): Promise<Company> {
  assertRole(ctx, ["owner", "admin"]);
  const [updated] = await db
    .update(company)
    .set({
      name: input.name,
      sector: input.sector,
      country: input.country,
      website: input.website || null,
      siren: input.siren || null,
      headcount: input.headcount ?? null,
    })
    .where(and(eq(company.id, companyId), eq(company.organizationId, ctx.organizationId)))
    .returning();
  if (!updated) throw new NotFoundError("Company");
  return updated;
}

export async function deleteCompany(ctx: OrgContext, companyId: string): Promise<void> {
  assertRole(ctx, ["owner"]);
  const deleted = await db
    .delete(company)
    .where(and(eq(company.id, companyId), eq(company.organizationId, ctx.organizationId)))
    .returning({ id: company.id });
  if (!deleted[0]) throw new NotFoundError("Company");
}
