import { describe, expect, it } from "vitest";
import { chooseFx } from "./fx";

describe("chooseFx", () => {
  it("defaults to full", () => expect(chooseFx({ pref: null })).toBe("full"));
  it("respects an explicit user choice over device hints", () => {
    expect(chooseFx({ pref: "full", saveData: true, deviceMemory: 1 })).toBe("full");
    expect(chooseFx({ pref: "lite" })).toBe("lite");
  });
  it("drops to lite on Data Saver", () => expect(chooseFx({ pref: null, saveData: true })).toBe("lite"));
  it("drops to lite at 2 GB of memory or less", () => {
    expect(chooseFx({ pref: null, deviceMemory: 2 })).toBe("lite");
    expect(chooseFx({ pref: null, deviceMemory: 4 })).toBe("full");
  });
  it("ignores unknown preference values", () => expect(chooseFx({ pref: "weird" })).toBe("full"));
});
