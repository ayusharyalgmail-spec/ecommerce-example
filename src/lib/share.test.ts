import { describe, expect, it, vi } from "vitest";
import { shareLink } from "./share";

const data = { title: "Tea", text: "Tea - Rs 100", url: "https://shop.test/product/tea" };
const nav = (o: Partial<Navigator>) => o as Navigator;

describe("shareLink", () => {
  it("uses the native share sheet with title, text and url", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    expect(await shareLink(data, nav({ share }))).toBe("shared");
    expect(share).toHaveBeenCalledWith(data);
  });
  it("treats closing the sheet as a normal cancel, not a copy", async () => {
    const writeText = vi.fn();
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "AbortError" }));
    expect(await shareLink(data, nav({ share, clipboard: { writeText } as unknown as Clipboard }))).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });
  it("copies the link when share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareLink(data, nav({ clipboard: { writeText } as unknown as Clipboard }))).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(data.url);
  });
  it("falls back to copy when share is refused", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "NotAllowedError" }));
    expect(await shareLink(data, nav({ share, clipboard: { writeText } as unknown as Clipboard }))).toBe("copied");
  });
  it("never opens WhatsApp", async () => {
    const open = vi.spyOn(window, "open");
    await shareLink(data, nav({ clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } as unknown as Clipboard }));
    expect(open).not.toHaveBeenCalled();
  });
});
