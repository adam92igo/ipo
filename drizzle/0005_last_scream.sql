DROP INDEX "company_org_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "company_org_uq" ON "company" USING btree ("organization_id");