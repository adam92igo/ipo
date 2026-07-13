import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalStyles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

describe("cockpit semantic color tokens", () => {
  it.each([
    ["direction", "#d1a13a"],
    ["positive", "#287b68"],
    ["attention", "#c65335"],
  ])("publishes %s for chart and state components", (token, value) => {
    expect(globalStyles).toContain(`--color-${token}: var(--${token});`);
    expect(globalStyles).toContain(`--${token}: ${value};`);
  });
});
