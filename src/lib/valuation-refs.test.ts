import { describe, expect, it } from "vitest";
import { matchSector } from "@/engines/valuation";
import {
  CURRENT_VALUATION_REFS_VERSION,
  getValuationRefs,
} from "./valuation-refs";

describe("valuation refs v1 config", () => {
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

  it("is memoized (same object identity across calls)", () => {
    expect(getValuationRefs("v1")).toBe(refs);
  });

  it("rejects unknown versions", () => {
    expect(() => getValuationRefs("v999")).toThrow(/Unknown valuation refs version/);
  });
});
