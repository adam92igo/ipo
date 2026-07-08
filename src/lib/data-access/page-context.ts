import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "../../db";
import { organization } from "../../db/schema";
import { requireOrgContext } from "./context";
import { NoActiveOrganizationError, UnauthenticatedError } from "./errors";
import type { OrgContext } from "./org-context";

/**
 * requireOrgContext for pages/layouts: maps auth errors to redirects instead
 * of throwing them at the framework.
 */
export async function requireOrgPageContext(): Promise<
  OrgContext & { organizationName: string }
> {
  let ctx: OrgContext;
  try {
    ctx = await requireOrgContext();
  } catch (error) {
    if (error instanceof UnauthenticatedError) redirect("/sign-in");
    if (error instanceof NoActiveOrganizationError) redirect("/onboarding");
    throw error;
  }

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, ctx.organizationId))
    .limit(1);

  return { ...ctx, organizationName: org?.name ?? "" };
}
