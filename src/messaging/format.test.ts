import { describe, expect, it } from "vitest";
import { badgeText, groupByPeriod, normalizePhone, periodOf, safeCta } from "./format";

describe("badgeText", () => {
  it("hides zero, negatives and junk", () => {
    expect(badgeText(0)).toBe("");
    expect(badgeText(-3)).toBe("");
    expect(badgeText(undefined)).toBe("");
    expect(badgeText(Number.NaN)).toBe("");
  });
  it("shows counts and caps above nine", () => {
    expect(badgeText(1)).toBe("1");
    expect(badgeText(9)).toBe("9");
    expect(badgeText(10)).toBe("9+");
    expect(badgeText(250)).toBe("9+");
  });
});

describe("normalizePhone", () => {
  it("adds +977 to Nepal mobile numbers, with or without separators", () => {
    expect(normalizePhone("9812345678")).toBe("+9779812345678");
    expect(normalizePhone("98 1234-5678")).toBe("+9779812345678");
    expect(normalizePhone("9779812345678")).toBe("+9779812345678");
  });
  it("keeps international numbers that carry a country code", () => {
    expect(normalizePhone("+61 412 345 678")).toBe("+61412345678");
  });
  it("rejects ambiguous or malformed input", () => {
    expect(normalizePhone("0412345678")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("+12")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("timeline grouping", () => {
  const now = new Date(2026, 9, 24, 15, 0);
  const at = (daysAgo: number) => new Date(2026, 9, 24 - daysAgo, 8, 0).toISOString();
  it("buckets by calendar day", () => {
    expect(periodOf(at(0), now)).toBe("today");
    expect(periodOf(at(1), now)).toBe("yesterday");
    expect(periodOf(at(4), now)).toBe("week");
    expect(periodOf(at(9), now)).toBe("earlier");
  });
  it("keeps order and omits empty buckets", () => {
    const g = groupByPeriod([{ at: at(9) }, { at: at(0) }, { at: at(0) }], now);
    expect(g.map((x) => [x.period, x.items.length])).toEqual([["today", 2], ["earlier", 1]]);
  });
});

describe("safeCta", () => {
  it("allows same-site paths and https links", () => {
    expect(safeCta("/shop?sale=1")).toEqual({ href: "/shop?sale=1", external: false });
    expect(safeCta("https://example.com/a")).toEqual({ href: "https://example.com/a", external: true });
  });
  it("drops scripts, protocol-relative and plain http targets", () => {
    for (const bad of ["javascript:alert(1)", "//evil.example", "/\\evil.example", "http://example.com", "data:text/html,x", "", null, undefined]) {
      expect(safeCta(bad)).toBeNull();
    }
  });
});
