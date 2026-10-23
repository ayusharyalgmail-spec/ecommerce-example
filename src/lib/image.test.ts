import { describe, expect, it } from "vitest";
import { BUCKET_MAX_BYTES, encodeCanvas, ImageError, validateImageFile } from "./image";

const file = (name: string, type: string, size = 10) => { const f = new File(["x"], name, { type }); Object.defineProperty(f, "size", { value: size }); return f; };
const code = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return e instanceof ImageError ? e.code : "other"; } };

describe("validateImageFile", () => {
  it("accepts common photo types including HEIC", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp", "image/heic"]) expect(code(() => validateImageFile(file("a", t)))).toBeNull();
  });
  it("accepts an empty MIME type when the extension is a photo (Android pickers)", () => expect(code(() => validateImageFile(file("IMG_1.jpg", "")))).toBeNull());
  it("rejects non-images", () => {
    expect(code(() => validateImageFile(file("a.pdf", "application/pdf")))).toBe("bad_type");
    expect(code(() => validateImageFile(file("a.svg", "image/svg+xml")))).toBe("bad_type");
    expect(code(() => validateImageFile(file("noext", "")))).toBe("bad_type");
  });
  it("rejects huge originals", () => expect(code(() => validateImageFile(file("a.jpg", "image/jpeg", 21 * 1024 * 1024)))).toBe("too_large"));
});

const canvas = (out: Record<string, { type: string; size: number } | null>) =>
  ({ toBlob: (cb: (b: Blob | null) => void, type: string) => { const o = out[type]; cb(o ? ({ type: o.type, size: o.size } as Blob) : null); } }) as unknown as HTMLCanvasElement;

describe("encodeCanvas", () => {
  it("keeps WebP when the browser can encode it", async () => {
    expect((await encodeCanvas(canvas({ "image/webp": { type: "image/webp", size: 100 } }))).type).toBe("image/webp");
  });
  it("uses JPEG when toBlob silently returns PNG for WebP", async () => {
    const b = await encodeCanvas(canvas({ "image/webp": { type: "image/png", size: 100 }, "image/jpeg": { type: "image/jpeg", size: 100 } }));
    expect(b.type).toBe("image/jpeg");
  });
  it("fails with a code when nothing fits the bucket limit", async () => {
    const big = { type: "image/jpeg", size: BUCKET_MAX_BYTES + 1 };
    await expect(encodeCanvas(canvas({ "image/webp": null, "image/jpeg": big }))).rejects.toMatchObject({ code: "encode" });
  });
});
