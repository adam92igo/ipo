import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandMark } from "./brand-mark";

describe("BrandMark", () => {
  it("uses the approved transparent asset and accessible name", () => {
    const html = renderToStaticMarkup(createElement(BrandMark));
    expect(html).toContain('src="/brand/ipo-compass-mark.png"');
    expect(html).toContain('alt="IPO Compass"');
  });

  it("can be decorative when the adjacent wordmark names the brand", () => {
    const html = renderToStaticMarkup(createElement(BrandMark, { decorative: true }));
    expect(html).toContain('alt=""');
  });
});
