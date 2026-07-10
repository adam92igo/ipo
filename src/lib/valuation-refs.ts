import { z } from "zod";
import type { ValuationRefs } from "@/engines/valuation/types";
import valuationRefsV1 from "../../config/valuation-refs.v1.json";
import valuationRefsV2 from "../../config/valuation-refs.v2.json";
import { createVersionedConfig } from "./versioned-config";

const rangeSchema = z
  .object({
    low: z.number().positive(),
    mid: z.number().positive(),
    high: z.number().positive(),
  })
  .refine((r) => r.low <= r.mid && r.mid <= r.high, {
    message: "multiple ranges must be ordered low <= mid <= high",
  });

const lowHighSchema = z
  .object({ low: z.number(), high: z.number() })
  .refine((r) => r.low <= r.high, { message: "low must not exceed high" });

const sectorSchema = z.object({
  label: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  wacc: z.number().min(0.02).max(0.35),
  evEbitda: rangeSchema,
  evRevenue: rangeSchema,
  /** Sourcing metadata — documented per sector so a reviewer can tell a citable figure from a working assumption. */
  source: z.string().min(1).optional(),
  asOf: z.string().min(1).optional(),
  confidence: z.string().min(1).optional(),
});

export const valuationRefsSchema = z
  .object({
    version: z.string().min(1),
    note: z.string(),
    discounting: z.object({
      forecastYears: z.number().int().min(1).max(15),
      terminalGrowth: z.number().min(0).max(0.05),
    }),
    growthClamp: z
      .object({ min: z.number().min(-0.5), max: z.number().max(1) })
      .refine((c) => c.min <= c.max),
    sectors: z.record(z.string(), sectorSchema),
    /** Shared WACC building blocks (risk-free rate, ERP, size premium), documented. */
    waccAssumptions: z
      .object({
        riskFreeRate: z.number(),
        equityRiskPremiumFrance: z.number(),
        sizePremiumRange: lowHighSchema,
        source: z.string().min(1),
        asOf: z.string().min(1),
        confidence: z.string().min(1),
      })
      .optional(),
  })
  .refine((refs) => "default" in refs.sectors, {
    message: "a `default` sector entry is required",
  })
  .refine(
    (refs) =>
      Object.values(refs.sectors).every(
        (s) => s.wacc > refs.discounting.terminalGrowth,
      ),
    { message: "every sector WACC must exceed the terminal growth rate" },
  );

export const CURRENT_VALUATION_REFS_VERSION = "v2";

/** Parses and validates a versioned refs file, once per version. */
export const getValuationRefs = createVersionedConfig<ValuationRefs>(
  "valuation refs",
  { v1: valuationRefsV1, v2: valuationRefsV2 },
  valuationRefsSchema,
);
