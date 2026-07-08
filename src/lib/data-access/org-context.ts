import {
  ForbiddenError,
  NoActiveOrganizationError,
  UnauthenticatedError,
} from "./errors";

export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export interface OrgContext {
  userId: string;
  organizationId: string;
  role: OrgRole;
}

/**
 * Shape-compatible with better-auth's getSession() result. Kept structural so
 * the scope resolution stays a pure, unit-testable function.
 */
export interface SessionLike {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
}

/**
 * Extracts the tenant scope from a session. The organizationId used to scope
 * queries NEVER comes from client input — only from here.
 */
export function resolveSessionScope(session: SessionLike | null | undefined): {
  userId: string;
  organizationId: string;
} {
  if (!session?.user?.id) throw new UnauthenticatedError();
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new NoActiveOrganizationError();
  return { userId: session.user.id, organizationId };
}

export function isOrgRole(value: string): value is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(value);
}

export function assertRole(ctx: OrgContext, allowed: readonly OrgRole[]): void {
  if (!allowed.includes(ctx.role)) throw new ForbiddenError();
}
