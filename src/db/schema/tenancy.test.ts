import { getTableColumns, getTableName } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as appSchema from "./app";

// Guardrail for the tenant-isolation invariant: any business table added to
// app.ts without a NOT NULL organization_id column fails this test.
describe("tenant isolation schema invariant", () => {
  const tables = (Object.values(appSchema) as unknown[]).filter(
    (v): v is PgTable => v instanceof PgTable,
  );

  it("finds the business tables", () => {
    expect(tables.length).toBeGreaterThanOrEqual(6);
  });

  it.each(tables.map((t) => [getTableName(t), t] as const))(
    "%s has a NOT NULL organization_id",
    (_name, table) => {
      const columns = getTableColumns(table);
      const orgColumn = Object.values(columns).find(
        (c) => c.name === "organization_id",
      );
      expect(orgColumn).toBeDefined();
      expect(orgColumn!.notNull).toBe(true);
    },
  );
});
