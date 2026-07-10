CREATE TYPE "public"."ai_usage_feature" AS ENUM('fill_profile', 'assistant_message');--> statement-breakpoint
CREATE TABLE "ai_usage_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"feature" "ai_usage_feature" NOT NULL,
	"amount" integer DEFAULT 1 NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage_event" ADD CONSTRAINT "ai_usage_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_org_feature_idx" ON "ai_usage_event" USING btree ("organization_id","feature","occurred_at");