import { describe, expect, it } from "vitest";
import { safeNext } from "./safeNext";

describe("safeNext", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/dashboard/profile")).toBe("/dashboard/profile");
  });
  it.each([null, "", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)"])(
    "falls back to /dashboard for %s", (v) => expect(safeNext(v)).toBe("/dashboard"));
});
