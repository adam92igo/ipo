import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "../db";
import { member, organization, user } from "../db/schema";

export async function migrateTestDb(): Promise<void> {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

export async function truncateAll(): Promise<void> {
  // Business tables cascade from organization; auth tables cascade from user.
  await db.execute(sql`TRUNCATE TABLE "organization", "user" CASCADE`);
}

let seedCounter = 0;

/** Creates an organization with one member and returns an OrgContext-shaped seed. */
export async function seedOrgWithUser(role: "owner" | "admin" | "member") {
  seedCounter += 1;
  const suffix = `${seedCounter}`;
  const userId = `user_${suffix}`;
  const organizationId = `org_${suffix}`;

  await db.insert(user).values({
    id: userId,
    name: `User ${suffix}`,
    email: `user${suffix}@test.local`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.insert(organization).values({
    id: organizationId,
    name: `Org ${suffix}`,
    slug: `org-${suffix}`,
    createdAt: new Date(),
  });
  await db.insert(member).values({
    id: `member_${suffix}`,
    organizationId,
    userId,
    role,
    createdAt: new Date(),
  });

  return { userId, organizationId, role };
}
