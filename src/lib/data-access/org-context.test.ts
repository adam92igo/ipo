import { describe, expect, it } from "vitest";
import {
  ForbiddenError,
  NoActiveOrganizationError,
  UnauthenticatedError,
} from "./errors";
import { assertRole, isOrgRole, resolveSessionScope } from "./org-context";

describe("resolveSessionScope", () => {
  it("throws UnauthenticatedError when there is no session", () => {
    expect(() => resolveSessionScope(null)).toThrow(UnauthenticatedError);
    expect(() => resolveSessionScope(undefined)).toThrow(UnauthenticatedError);
  });

  it("throws NoActiveOrganizationError when the session has no active org", () => {
    const session = { user: { id: "u1" }, session: { activeOrganizationId: null } };
    expect(() => resolveSessionScope(session)).toThrow(NoActiveOrganizationError);
  });

  it("returns userId and organizationId from a valid session", () => {
    const session = { user: { id: "u1" }, session: { activeOrganizationId: "org1" } };
    expect(resolveSessionScope(session)).toEqual({
      userId: "u1",
      organizationId: "org1",
    });
  });
});

describe("assertRole", () => {
  const ctx = { userId: "u1", organizationId: "org1", role: "member" as const };

  it("throws ForbiddenError when the role is not allowed", () => {
    expect(() => assertRole(ctx, ["owner", "admin"])).toThrow(ForbiddenError);
  });

  it("passes when the role is allowed", () => {
    expect(() => assertRole(ctx, ["owner", "admin", "member"])).not.toThrow();
  });
});

describe("isOrgRole", () => {
  it("accepts the three known roles and rejects anything else", () => {
    expect(isOrgRole("owner")).toBe(true);
    expect(isOrgRole("admin")).toBe(true);
    expect(isOrgRole("member")).toBe(true);
    expect(isOrgRole("superadmin")).toBe(false);
    expect(isOrgRole("")).toBe(false);
  });
});
