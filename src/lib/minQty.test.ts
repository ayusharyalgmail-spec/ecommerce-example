import { describe, expect, it } from "vitest";
import { fixQty, lineIssue, minQty } from "./minQty";

describe("minQty", () => {
  it("defaults missing, invalid and sub-1 values to 1", () => {
    for (const v of [undefined, null, 0, -3, 1, Number.NaN]) expect(minQty(v)).toBe(1);
  });
  it("keeps whole minimums above 1", () => {
    expect(minQty(6)).toBe(6);
    expect(minQty(2.9)).toBe(2);
  });
});

describe("lineIssue (same order as quote_checkout)", () => {
  it("accepts a quantity between the minimum and the stock", () => {
    expect(lineIssue(6, 10, 6)).toBeNull();
    expect(lineIssue(10, 10, 6)).toBeNull();
  });
  it("flags below the minimum", () => expect(lineIssue(5, 10, 6)).toBe("below_min"));
  it("flags more than available", () => expect(lineIssue(11, 10, 6)).toBe("over"));
  it("treats no stock, or less stock than the minimum, as unavailable", () => {
    expect(lineIssue(1, 0, 1)).toBe("out");
    expect(lineIssue(6, 4, 6)).toBe("out");
  });
});

describe("fixQty", () => {
  it("raises to the minimum", () => expect(fixQty(2, 10, 6)).toBe(6));
  it("lowers to the stock", () => expect(fixQty(12, 10, 6)).toBe(10));
  it("removes lines that cannot be bought", () => {
    expect(fixQty(3, 0, 1)).toBe(0);
    expect(fixQty(6, 4, 6)).toBe(0);
  });
  it("leaves a valid quantity alone", () => expect(fixQty(7, 10, 6)).toBe(7));
});
