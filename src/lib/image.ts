/** Downscale to a max edge and re-encode as WebP before upload (ARCHITECTURE.md section 10). */
export async function toWebp(file: File, maxEdge = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.85));
}

export type ImageMeta = { width: number; height: number; blur_color: string };

/** Size after downscale plus the average colour, used as the placeholder tile while the photo loads. */
export async function imageMeta(blob: Blob): Promise<ImageMeta> {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const g = c.getContext("2d")!;
  g.drawImage(bmp, 0, 0, 1, 1);
  const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return { width: bmp.width, height: bmp.height, blur_color: `#${hex(r)}${hex(gr)}${hex(b)}` };
}
