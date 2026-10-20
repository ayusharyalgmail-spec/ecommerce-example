import { describe, expect, it } from "vitest";
import { brandCss, contrast, deriveBrand, parseHex } from "./brand";

// The Phase 1 brand matrix: default marigold plus a very light, a very dark, a mid-tone and two typical vendor colours.
const MATRIX = ["#F5A524", "#FFF200", "#111111", "#808080", "#0B7285", "#C2255C", "#2F9E44"];

describe("deriveBrand", () => {
  it("rejects invalid colours", () => {
    expect(deriveBrand("not-a-colour")).toBeNull();
    expect(deriveBrand("#12")).toBeNull();
  });

  it.each(MATRIX)("%s gets readable button text (>= 4.5:1)", (hex) => {
    const r = deriveBrand(hex)!;
    expect(r).not.toBeNull();
    expect(contrast(parseHex(r.brand)!, parseHex(r.onBrand)!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(MATRIX)("%s gets stroke colours with >= 3:1 on every surface", (hex) => {
    const r = deriveBrand(hex)!;
    for (const s of ["#FFFFFF", "#F7F6FB"]) expect(contrast(parseHex(r.strongLight)!, parseHex(s)!)).toBeGreaterThanOrEqual(3);
    for (const s of ["#181B45", "#0E1030"]) expect(contrast(parseHex(r.strongDark)!, parseHex(s)!)).toBeGreaterThanOrEqual(3);
  });

  it("keeps the default marigold unchanged and uses ink text on it", () => {
    const r = deriveBrand("#F5A524")!;
    expect(r.brand).toBe("#F5A524");
    expect(r.onBrand).toBe("#15173A");
    expect(r.clamped).toBe(false);
  });

  it("clamps a mid-tone that cannot carry either text colour and warns", () => {
    // #7B7B7B has luminance about 0.20: below 4.5:1 against both ink and white
    const input = parseHex("#7B7B7B")!;
    expect(contrast(input, parseHex("#15173A")!)).toBeLessThan(4.5);
    expect(contrast(input, parseHex("#FFFFFF")!)).toBeLessThan(4.5);
    const r = deriveBrand("#7B7B7B")!;
    expect(r.clamped).toBe(true);
    expect(r.warning).toContain("#7B7B7B");
    expect(r.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("accepts 3-digit hex", () => {
    expect(deriveBrand("#fa0")!.brand).toBe("#FFAA00");
  });
});

describe("brandCss", () => {
  it("covers light, explicit dark and system dark", () => {
    const css = brandCss(deriveBrand("#C2255C"));
    expect(css).toContain(":root{");
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain("prefers-color-scheme: dark");
  });
  it("is empty for no brand", () => expect(brandCss(null)).toBe(""));
});
