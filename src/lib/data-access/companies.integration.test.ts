import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { migrateTestDb, seedOrgWithUser, truncateAll } from "../../test/db";
import {
  createCompany,
  deleteCompany,
  getCompany,
  listCompanies,
  updateCompany,
} from "./companies";
import { ForbiddenError, NotFoundError } from "./errors";

const baseInput = {
  name: "Acme SAS",
  sector: "Software",
  country: "FR",
};

describe("companies data-access (tenant isolation)", () => {
  beforeAll(async () => {
    await migrateTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  it("scopes listCompanies to the caller's organization", async () => {
    const ctxA = await seedOrgWithUser("owner");
    const ctxB = await seedOrgWithUser("owner");

    await createCompany(ctxA, { ...baseInput, name: "Company A" });
    await createCompany(ctxB, { ...baseInput, name: "Company B" });

    const listA = await listCompanies(ctxA);
    const listB = await listCompanies(ctxB);

    expect(listA.map((c) => c.name)).toEqual(["Company A"]);
    expect(listB.map((c) => c.name)).toEqual(["Company B"]);
  });

  it("refuses cross-organization reads even with a valid company id", async () => {
    const ctxA = await seedOrgWithUser("owner");
    const ctxB = await seedOrgWithUser("owner");
    const companyA = await createCompany(ctxA, baseInput);

    await expect(getCompany(ctxB, companyA.id)).rejects.toThrow(NotFoundError);
  });

  it("refuses cross-organization updates and deletes", async () => {
    const ctxA = await seedOrgWithUser("owner");
    const ctxB = await seedOrgWithUser("owner");
    const companyA = await createCompany(ctxA, baseInput);

    await expect(
      updateCompany(ctxB, companyA.id, { ...baseInput, name: "Hijacked" }),
    ).rejects.toThrow(NotFoundError);
    await expect(deleteCompany(ctxB, companyA.id)).rejects.toThrow(NotFoundError);

    // Untouched for the legitimate org.
    const still = await getCompany(ctxA, companyA.id);
    expect(still.name).toBe("Acme SAS");
  });

  it("stamps organizationId from the context, never from input", async () => {
    const ctx = await seedOrgWithUser("admin");
    const created = await createCompany(ctx, baseInput);
    expect(created.organizationId).toBe(ctx.organizationId);
    expect(created.createdBy).toBe(ctx.userId);
  });

  it("blocks members from writing but lets them read", async () => {
    const owner = await seedOrgWithUser("owner");
    const memberCtx = { ...owner, role: "member" as const };

    await createCompany(owner, baseInput);

    await expect(createCompany(memberCtx, baseInput)).rejects.toThrow(ForbiddenError);
    await expect(listCompanies(memberCtx)).resolves.toHaveLength(1);
  });

  it("restricts deletion to owners", async () => {
    const owner = await seedOrgWithUser("owner");
    const adminCtx = { ...owner, role: "admin" as const };
    const created = await createCompany(owner, baseInput);

    await expect(deleteCompany(adminCtx, created.id)).rejects.toThrow(ForbiddenError);
    await expect(deleteCompany(owner, created.id)).resolves.toBeUndefined();
    await expect(getCompany(owner, created.id)).rejects.toThrow(NotFoundError);
  });
});
