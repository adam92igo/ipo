import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// Every business table carries organization_id (tenant isolation invariant).
const orgId = () =>
  text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" });

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const assessmentStatusEnum = pgEnum("assessment_status", [
  "in_progress",
  "completed",
]);

export const roadmapStatusEnum = pgEnum("roadmap_item_status", [
  "todo",
  "in_progress",
  "done",
]);

export const roadmapPriorityEnum = pgEnum("roadmap_priority", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const aiUsageFeatureEnum = pgEnum("ai_usage_feature", [
  "fill_profile",
  "assistant_message",
]);

export const company = pgTable(
  "company",
  {
    id: id(),
    organizationId: orgId(),
    name: text("name").notNull(),
    sector: text("sector").notNull(),
    country: text("country").notNull().default("FR"),
    website: text("website"),
    siren: text("siren"),
    headcount: integer("headcount"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  // At most one company per organization — enforced here, not just in
  // application code, so a race between two concurrent creates can't slip
  // a second row past the check.
  (t) => [uniqueIndex("company_org_uq").on(t.organizationId)],
);

// One row per fiscal year; valuation needs >= 3 years of history.
export const companyFinancials = pgTable(
  "company_financials",
  {
    id: id(),
    organizationId: orgId(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    fiscalYear: integer("fiscal_year").notNull(),
    // EUR amounts; numeric keeps exact values, engines parse to numbers at the boundary.
    revenue: numeric("revenue", { precision: 18, scale: 2 }),
    ebitda: numeric("ebitda", { precision: 18, scale: 2 }),
    netIncome: numeric("net_income", { precision: 18, scale: 2 }),
    netDebt: numeric("net_debt", { precision: 18, scale: 2 }),
    freeCashFlow: numeric("free_cash_flow", { precision: 18, scale: 2 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("financials_company_year_uq").on(t.companyId, t.fiscalYear),
    index("financials_org_idx").on(t.organizationId),
  ],
);

export const assessment = pgTable(
  "assessment",
  {
    id: id(),
    organizationId: orgId(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    // References the versioned config file the answers/scores were computed against.
    questionnaireVersion: text("questionnaire_version").notNull(),
    status: assessmentStatusEnum("status").notNull().default("in_progress"),
    // Frozen at completion: { governance: 82, finance: 74, ... } and global score.
    categoryScores: jsonb("category_scores").$type<Record<string, number>>(),
    globalScore: numeric("global_score", { precision: 5, scale: 2 }),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    ...timestamps,
  },
  (t) => [
    index("assessment_org_idx").on(t.organizationId),
    index("assessment_company_idx").on(t.companyId),
    // DB-level guarantee: at most one open assessment per company.
    uniqueIndex("assessment_active_company_uq")
      .on(t.companyId)
      .where(sql`${t.status} = 'in_progress'`),
  ],
);

// Upserted per question — this is the multi-step form's progress save.
export const answer = pgTable(
  "answer",
  {
    id: id(),
    organizationId: orgId(),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessment.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    value: jsonb("value").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("answer_assessment_question_uq").on(t.assessmentId, t.questionId),
    index("answer_org_idx").on(t.organizationId),
  ],
);

export const valuationRun = pgTable(
  "valuation_run",
  {
    id: id(),
    organizationId: orgId(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    // Version of config/valuation-refs.v*.json used for sector multiples etc.
    refsVersion: text("refs_version").notNull(),
    inputs: jsonb("inputs").notNull(),
    // Per-method results + aggregated min/max range, all in EUR.
    results: jsonb("results").notNull(),
    ...timestamps,
  },
  (t) => [
    index("valuation_org_idx").on(t.organizationId),
    index("valuation_company_idx").on(t.companyId),
  ],
);

export const roadmapItem = pgTable(
  "roadmap_item",
  {
    id: id(),
    organizationId: orgId(),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessment.id, { onDelete: "cascade" }),
    // Rule + version from config/roadmap-rules.v*.json that produced this item.
    ruleId: text("rule_id").notNull(),
    rulesVersion: text("rules_version").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    priority: roadmapPriorityEnum("priority").notNull(),
    estimatedWeeks: integer("estimated_weeks"),
    status: roadmapStatusEnum("status").notNull().default("todo"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("roadmap_org_idx").on(t.organizationId),
    index("roadmap_assessment_idx").on(t.assessmentId),
    // One item per rule per assessment — makes concurrent regeneration safe.
    uniqueIndex("roadmap_assessment_rule_uq").on(t.assessmentId, t.ruleId),
  ],
);

// One row per rate-limited AI call; the trailing window is summed at query
// time (see src/lib/data-access/rate-limit.ts), never mutated in place.
export const aiUsageEvent = pgTable(
  "ai_usage_event",
  {
    id: id(),
    organizationId: orgId(),
    feature: aiUsageFeatureEnum("feature").notNull(),
    amount: integer("amount").notNull().default(1),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  },
  (t) => [
    index("ai_usage_org_feature_idx").on(t.organizationId, t.feature, t.occurredAt),
  ],
);
