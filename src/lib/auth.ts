import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "../db";
import * as schema from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 10,
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // New sessions land in the user's first organization so every
          // request has a tenant scope without an extra selection step.
          const membership = await db.query.member.findFirst({
            where: eq(schema.member.userId, session.userId),
          });
          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId ?? null,
            },
          };
        },
      },
    },
  },
  plugins: [
    organization({
      creatorRole: "owner",
      membershipLimit: 50,
      async sendInvitationEmail(data) {
        // MVP: no email provider wired yet — surface the link in server logs.
        console.log(
          `[invitation] ${data.email} -> ${data.organization.name}: ${process.env.BETTER_AUTH_URL}/accept-invitation/${data.id}`,
        );
      },
    }),
    // Must stay last: makes server actions set auth cookies correctly.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
