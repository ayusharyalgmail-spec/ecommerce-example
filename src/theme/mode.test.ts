import { afterEach, describe, expect, it } from "vitest";
import { readMode } from "./ThemeProvider";

describe("readMode", () => {
  afterEach(() => localStorage.clear());
  it("defaults first-time visitors to light", () => expect(readMode()).toBe("light"));
  it("keeps an explicit dark or system choice", () => {
    localStorage.setItem("theme", "dark");
    expect(readMode()).toBe("dark");
    localStorage.setItem("theme", "system");
    expect(readMode()).toBe("system");
  });
  it("treats unknown values as light", () => {
    localStorage.setItem("theme", "purple");
    expect(readMode()).toBe("light");
  });
});
