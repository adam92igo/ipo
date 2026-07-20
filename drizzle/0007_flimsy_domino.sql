CREATE TABLE "company_share_structure" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"existing_shares" numeric(18, 0) NOT NULL,
	"new_shares" numeric(18, 0) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_share_structure" ADD CONSTRAINT "company_share_structure_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_structure" ADD CONSTRAINT "company_share_structure_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "share_structure_company_uq" ON "company_share_structure" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "share_structure_org_idx" ON "company_share_structure" USING btree ("organization_id");