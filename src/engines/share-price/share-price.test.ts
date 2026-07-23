import { describe, expect, it } from "vitest";
import {
  computeSharePrice,
  InvalidShareInputError,
  type ShareInputs,
} from "./index";

const equity = { low: 8_000_000, mid: 10_000_000, high: 12_000_000 };

const inputs = (over: Partial<ShareInputs> = {}): ShareInputs => ({
  equity,
  existingShares: 1_000_000,
  newShares: 250_000,
  ...over,
});

describe("computeSharePrice", () => {
  it("computes the pre-money price = equity / existing shares", () => {
    const r = computeSharePrice(inputs({ newShares: 0 }));
    expect(r.preMoney.shareCount).toBe(1_000_000);
    expect(r.preMoney.low).toBe(8); // 8M / 1M
    expect(r.preMoney.mid).toBe(10);
    expect(r.preMoney.high).toBe(12);
  });

  it("computes the post-money price on the diluted base", () => {
    const r = computeSharePrice(inputs()); // 250k new => 1.25M total
    expect(r.postMoney.shareCount).toBe(1_250_000);
    expect(r.postMoney.mid).toBe(8); // 10M / 1.25M
    expect(r.postMoney.low).toBe(6.4); // 8M / 1.25M
    expect(r.postMoney.high).toBe(9.6); // 12M / 1.25M
  });

  it("computes the dilution of existing shareholders", () => {
    const r = computeSharePrice(inputs()); // 250k / 1.25M = 20%
    expect(r.dilution).toBe(0.2);
  });

  it("estimates gross proceeds at the post-money mid price", () => {
    const r = computeSharePrice(inputs()); // 250k × 8 = 2,000,000
    expect(r.grossProceedsMid).toBe(2_000_000);
  });

  it("with no new shares: post-money = pre-money, zero dilution", () => {
    const r = computeSharePrice(inputs({ newShares: 0 }));
    expect(r.dilution).toBe(0);
    expect(r.grossProceedsMid).toBe(0);
    expect(r.postMoney).toEqual(r.preMoney);
    expect(r.assumptions.some((a) => a.includes("No new shares issued"))).toBe(
      true,
    );
  });

  it("is deterministic", () => {
    expect(computeSharePrice(inputs())).toEqual(computeSharePrice(inputs()));
  });

  it("rejects a zero or negative number of existing shares", () => {
    expect(() => computeSharePrice(inputs({ existingShares: 0 }))).toThrow(
      InvalidShareInputError,
    );
    expect(() => computeSharePrice(inputs({ existingShares: -5 }))).toThrow(
      InvalidShareInputError,
    );
  });

  it("rejects a negative number of new shares", () => {
    expect(() => computeSharePrice(inputs({ newShares: -1 }))).toThrow(
      InvalidShareInputError,
    );
  });

  it("rejects a misordered equity range", () => {
    expect(() =>
      computeSharePrice(
        inputs({ equity: { low: 12_000_000, mid: 10_000_000, high: 8_000_000 } }),
      ),
    ).toThrow(InvalidShareInputError);
  });
});
