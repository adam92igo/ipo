import { describe, expect, it } from "vitest";
import {
  CURRENT_MARKET_RESEARCH_VERSION,
  getMarketResearchFile,
  getSectorContext,
  getSegmentRules,
} from "./market-research";

describe("market research config", () => {
  it("loads and validates the current version", () => {
    const file = getMarketResearchFile(CURRENT_MARKET_RESEARCH_VERSION);
    expect(file.version).toBe(CURRENT_MARKET_RESEARCH_VERSION);
    expect(file.segments.length).toBeGreaterThanOrEqual(4);
    expect(file.listingActNote).toMatch(/Listing Act/i);
  });

  it("orders segments from Access to regulated by tier", () => {
    const rules = getSegmentRules();
    const tiers = rules.map((r) => r.tier);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    expect(rules[0].id).toBe("access");
  });

  it("returns sector context, falling back to default", () => {
    expect(getSectorContext("software").marketLabel).toMatch(/Software/);
    expect(getSectorContext("nonexistent").marketLabel).toBe("General mid-market");
  });

  it("throws on an unknown version", () => {
    expect(() => getMarketResearchFile("v99")).toThrow(/Unknown market research/);
  });
});
