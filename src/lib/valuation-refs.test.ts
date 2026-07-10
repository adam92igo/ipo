import { describe, expect, it } from "vitest";
import { matchSector } from "@/engines/valuation";
import {
  CURRENT_VALUATION_REFS_VERSION,
  getValuationRefs,
} from "./valuation-refs";

describe("valuation refs current config", () => {
  const refs = getValuationRefs(CURRENT_VALUATION_REFS_VERSION);

  it("validates and exposes a default sector", () => {
    expect(refs.sectors.default).toBeDefined();
    expect(refs.sectors.default.aliases).toEqual([]);
  });

  it("maps common French SME sector labels to a non-default entry", () => {
    for (const label of ["Software", "Industrial robotics", "Food processing", "Conseil"]) {
      expect(matchSector(label, refs).label).not.toBe(refs.sectors.default.label);
    }
  });

  it("routes biotech/medtech to healthcare despite software's generic 'tech' alias", () => {
    expect(matchSector("Biotech", refs).label).toBe(refs.sectors.healthcare.label);
    expect(matchSector("Medtech startup", refs).label).toBe(
      refs.sectors.healthcare.label,
    );
  });

  it("is memoized (same object identity across calls)", () => {
    expect(getValuationRefs(CURRENT_VALUATION_REFS_VERSION)).toBe(refs);
  });

  it("rejects unknown versions", () => {
    expect(() => getValuationRefs("v999")).toThrow(/Unknown valuation refs version/);
  });
});
