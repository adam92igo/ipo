import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Stored assessments and valuation runs reference their config VERSION, and
 * the version string is the only link back to the content that produced them.
 * A released version file must therefore never change: fix content by
 * creating questionnaire.v2.json / valuation-refs.v2.json instead.
 *
 * If this test fails, you edited a released config in place. Either revert,
 * or (before any real data exists) consciously update the pinned hash here.
 */
const PINNED = {
  "config/questionnaire.v1.json":
    "sha256:50e824039ee8748c3906f28d875d137aa7bee7f082ff8e3afd6c497185185cfe",
  "config/roadmap-rules.v1.json":
    "sha256:32be18be49f4bbce9f734a5674b44b609a497ec62f2318aa0eca84737a53a37b",
  "config/valuation-refs.v1.json":
    "sha256:1a89fa436156b8905f94949682b52689e5fec84ecd5465ffc90824f569987b31",
  "config/questionnaire.v2.json":
    "sha256:f19977b0cd66e0bcacd719b47dc96495392b2382562b23095272aceb8c8eab31",
  "config/roadmap-rules.v2.json":
    "sha256:d71e489f67f8753eded012ff4d50728f0e865f60af8b00260e5af160834301b1",
  "config/valuation-refs.v2.json":
    "sha256:dbdb8baa30d55b12de9d5fd8736c2c94de5327fc658316f72888b11bd5206153",
};

const hash = (path: string) =>
  `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;

describe("released config files are immutable", () => {
  for (const [path, pinned] of Object.entries(PINNED)) {
    it(`${path} matches its pinned content hash`, () => {
      expect(hash(path)).toBe(pinned);
    });
  }
});
