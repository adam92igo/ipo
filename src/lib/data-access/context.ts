import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { db } from "../../db";
import { member } from "../../db/schema";
import { auth } from "../auth";
import { NoActiveOrganizationError } from "./errors";
import { isOrgRole, resolveSessionScope, type OrgContext } from "./org-context";

export { assertRole } from "./org-context";

/**
 * Session lookup deduplicated per request — layouts, pages and
 * requireOrgContext all share one better-auth call.
 */
export const getCachedSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/**
 * Resolves the authenticated tenant context for the current request.
 *
 * Verifies membership in the DB rather than trusting the session's
 * activeOrganizationId alone: a user removed from an organization must lose
 * access immediately, even with a live session pointing at that org.
 *
 * Wrapped in react cache() so layouts/pages/actions in one request share a
 * single lookup.
 */
export const requireOrgContext = cache(async (): Promise<OrgContext> => {
  const session = await getCachedSession();
  const { userId, organizationId } = resolveSessionScope(session);

  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);

  const role = membership[0]?.role;
  if (!role || !isOrgRole(role)) throw new NoActiveOrganizationError();

  return { userId, organizationId, role };
});
