import { describe, expect, it } from "vitest";
import { chooseFx } from "./fx";

describe("chooseFx", () => {
  it("defaults to lite for fresh users", () => {
    expect(chooseFx({ pref: null })).toBe("lite");
    expect(chooseFx({ pref: null, deviceMemory: 16, cores: 16, touch: false })).toBe("lite");
  });
  it("respects an explicit saved choice over device hints", () => {
    expect(chooseFx({ pref: "full", saveData: true, deviceMemory: 1 })).toBe("full");
    expect(chooseFx({ pref: "lite", deviceMemory: 16 })).toBe("lite");
  });
  it("treats unknown preference values as no preference", () => expect(chooseFx({ pref: "weird" })).toBe("lite"));
});
