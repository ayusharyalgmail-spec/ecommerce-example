/** Image preparation for uploads (ARCHITECTURE.md section 10): validate, decode, downscale, re-encode. */

/** Bucket limit (storage.buckets.file_size_limit) for product-images, store-assets and payment-proofs. */
export const BUCKET_MAX_BYTES = 5 * 1024 * 1024;
/** Largest original we try to decode; bigger files tend to crash low-memory phones. */
export const INPUT_MAX_BYTES = 20 * 1024 * 1024;

/** Stable codes the UI translates as `img.<code>`. */
export type ImageErrorCode = "bad_type" | "too_large" | "decode" | "encode";
export class ImageError extends Error {
  constructor(public code: ImageErrorCode) { super(code); this.name = "ImageError"; }
}

// Android pickers sometimes report an empty type or HEIC; we let the browser try to decode those.
const OK_TYPE = /^image\/(jpeg|jpg|pjpeg|png|webp|heic|heif|avif|gif|bmp)$/i;
const OK_EXT = /\.(jpe?g|png|webp|heic|heif|avif|gif|bmp)$/i;

/** Cheap checks before decoding. Throws ImageError. */
export function validateImageFile(file: File) {
  if (!(OK_TYPE.test(file.type) || (!file.type && OK_EXT.test(file.name)))) throw new ImageError("bad_type");
  if (file.size > INPUT_MAX_BYTES) throw new ImageError("too_large");
}

type Source = { el: CanvasImageSource; width: number; height: number; close: () => void };

async function decode(file: Blob): Promise<Source> {
  if (typeof createImageBitmap === "function") {
    try {
      const b = await createImageBitmap(file);
      return { el: b, width: b.width, height: b.height, close: () => b.close?.() };
    } catch { /* fall back to <img>, which decodes more formats on some browsers (e.g. HEIC on Safari) */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { el: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageError("decode");
  }
}

const toBlob = (c: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob | null>((res) => { try { c.toBlob(res, type, q); } catch { res(null); } });

/** Encode, preferring WebP. Falls back to JPEG with progressively lower quality until the file fits. */
export async function encodeCanvas(c: HTMLCanvasElement): Promise<Blob> {
  // Try WebP first — smallest at equal visual quality
  for (const q of [0.82, 0.65]) {
    const webp = await toBlob(c, "image/webp", q);
    if (webp?.type === "image/webp" && webp.size <= BUCKET_MAX_BYTES) return webp;
  }
  // JPEG fallback — wider browser support, more quality tiers for slow networks
  for (const q of [0.82, 0.7, 0.55, 0.4]) {
    const jpg = await toBlob(c, "image/jpeg", q);
    if (jpg && jpg.size <= BUCKET_MAX_BYTES) return jpg;
  }
  throw new ImageError("encode");
}

export type ImageMeta = { width: number; height: number; blur_color: string };
export type Prepared = { blob: Blob; ext: "webp" | "jpg"; meta: ImageMeta };

/** Validate, downscale to `maxEdge`, re-encode, and compute the placeholder colour. Throws ImageError. */
export async function prepareImage(file: File, maxEdge = 1200): Promise<Prepared> {
  validateImageFile(file);
  const src = await decode(file);
  try {
    if (!src.width || !src.height) throw new ImageError("decode");
    const scale = Math.min(1, maxEdge / Math.max(src.width, src.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(src.width * scale)); c.height = Math.max(1, Math.round(src.height * scale));
    const g = c.getContext("2d");
    if (!g) throw new ImageError("encode");
    g.drawImage(src.el, 0, 0, c.width, c.height);
    const blob = await encodeCanvas(c);
    return { blob, ext: blob.type === "image/webp" ? "webp" : "jpg", meta: { width: c.width, height: c.height, blur_color: averageColour(c) } };
  } finally { src.close(); }
}

function averageColour(c: HTMLCanvasElement): string {
  try {
    const one = document.createElement("canvas");
    one.width = one.height = 1;
    const g = one.getContext("2d")!;
    g.drawImage(c, 0, 0, 1, 1);
    const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
    const hex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(gr)}${hex(b)}`;
  } catch { return "#d4d4d4"; }
}

/** @deprecated kept for existing callers; use prepareImage. */
export async function toWebp(file: File, maxEdge = 1600): Promise<Blob> {
  return (await prepareImage(file, maxEdge)).blob;
}

/** @deprecated kept for existing callers; prepareImage returns the meta. */
export async function imageMeta(blob: Blob): Promise<ImageMeta> {
  const src = await decode(blob);
  try {
    const c = document.createElement("canvas");
    c.width = src.width; c.height = src.height;
    c.getContext("2d")?.drawImage(src.el, 0, 0);
    return { width: src.width, height: src.height, blur_color: averageColour(c) };
  } finally { src.close(); }
}
