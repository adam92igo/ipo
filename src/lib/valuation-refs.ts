import { z } from "zod";
import type { ValuationRefs } from "@/engines/valuation/types";
import valuationRefsV1 from "../../config/valuation-refs.v1.json";

const rangeSchema = z
  .object({
    low: z.number().positive(),
    mid: z.number().positive(),
    high: z.number().positive(),
  })
  .refine((r) => r.low <= r.mid && r.mid <= r.high, {
    message: "multiple ranges must be ordered low <= mid <= high",
  });

const sectorSchema = z.object({
  label: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  wacc: z.number().min(0.02).max(0.35),
  evEbitda: rangeSchema,
  evRevenue: rangeSchema,
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

const registry: Record<string, unknown> = {
  v1: valuationRefsV1,
};

export const CURRENT_VALUATION_REFS_VERSION = "v1";

const parsedCache = new Map<string, ValuationRefs>();

/** Parses and validates a versioned refs file, once per version. */
export function getValuationRefs(version: string): ValuationRefs {
  const cached = parsedCache.get(version);
  if (cached) return cached;
  const raw = registry[version];
  if (!raw) throw new Error(`Unknown valuation refs version: ${version}`);
  const parsed = valuationRefsSchema.parse(raw) as ValuationRefs;
  parsedCache.set(version, parsed);
  return parsed;
}
