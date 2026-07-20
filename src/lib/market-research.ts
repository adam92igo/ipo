import { z } from "zod";
import type { SegmentRule } from "@/engines/market-research/types";
import marketResearchV1 from "../../config/market-research.v1.json";
import { createVersionedConfig } from "./versioned-config";

const segmentSchema = z.object({
  id: z.enum(["access", "access_plus", "growth", "regulated"]),
  label: z.string().min(1),
  tier: z.number().int().min(0),
  minMarketCap: z.number().positive().nullable(),
  minFreeFloat: z.number().positive().nullable(),
  minAuditedYears: z.number().int().min(0),
  summary: z.string().min(1),
  bestFor: z.string().min(1),
  source: z.string().min(1),
});

const sectorContextSchema = z.object({
  marketLabel: z.string().min(1),
  sizeTrend: z.string().min(1),
  drivers: z.array(z.string().min(1)),
  ipoWindow: z.string().min(1),
  confidence: z.string().min(1),
  source: z.string().min(1),
});

export const marketResearchSchema = z
  .object({
    version: z.string().min(1),
    note: z.string(),
    asOf: z.string().min(1),
    listingActNote: z.string().min(1),
    segments: z.array(segmentSchema).min(1),
    sectors: z.record(z.string(), sectorContextSchema),
  })
  .refine((c) => "default" in c.sectors, {
    message: "a `default` sector context is required",
  });

export type SectorContext = z.infer<typeof sectorContextSchema>;

export interface MarketResearchFile {
  version: string;
  note: string;
  asOf: string;
  listingActNote: string;
  segments: SegmentRule[];
  sectors: Record<string, SectorContext>;
}

export const CURRENT_MARKET_RESEARCH_VERSION = "v1";

export const getMarketResearchFile = createVersionedConfig<MarketResearchFile>(
  "market research",
  { v1: marketResearchV1 },
  marketResearchSchema,
);

/** Segment rules (engine-ready) for a given version. */
export function getSegmentRules(
  version: string = CURRENT_MARKET_RESEARCH_VERSION,
): SegmentRule[] {
  return getMarketResearchFile(version).segments;
}

/**
 * Sector market context for a sector key (same taxonomy as valuation refs),
 * falling back to `default`.
 */
export function getSectorContext(
  sectorKey: string,
  version: string = CURRENT_MARKET_RESEARCH_VERSION,
): SectorContext {
  const file = getMarketResearchFile(version);
  return file.sectors[sectorKey] ?? file.sectors.default;
}
