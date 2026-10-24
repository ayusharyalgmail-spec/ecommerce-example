// Gallery Editor — manage photos and showcase images for the business.
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT, pick } from "@/lib/i18n";
import { useManagedTenant } from "./useManagedTenant";
import { useTenantGallery, tenantAssetUrl } from "@/platform/queries";
import { uploadGalleryImage, deleteGalleryImage } from "@/platform/api";
import { Input } from "@/ui";
import { toast } from "@/ui/toast";
import { ImageIcon, Upload, Trash2, Plus, LoaderCircle as Loader2 } from "@/ui/icons";

export default function GalleryEditor() {
  const tenant = useManagedTenant();
  const { locale } = useT();
  const qc = useQueryClient();
  const { data: gallery, isLoading } = useTenantGallery(tenant.id);

  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      let successCount = 0;
      let errorMsg: string | null = null;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadGalleryImage(tenant.id, file, caption);
        if (res.error) {
          errorMsg = res.error;
        } else {
          successCount++;
        }
      }

      setUploading(false);
      setCaption("");
      e.target.value = "";

      if (errorMsg && successCount === 0) {
        toast.error(errorMsg);
      } else {
        toast.success(
          pick(
            locale,
            `${successCount} photo(s) uploaded successfully!`,
            `${successCount} फोटो सफलतापूर्वक अपलोड भयो!`
          )
        );
        qc.invalidateQueries({ queryKey: ["tenant-gallery", tenant.id] });
      }
    },
    [tenant.id, caption, locale, qc]
  );

  const handleDelete = useCallback(
    async (id: string, path: string) => {
      if (!confirm(pick(locale, "Delete this photo?", "के यो फोटो हटाउन चाहनुहुन्छ?"))) return;
      setDeletingId(id);
      const err = await deleteGalleryImage(id, path);
      setDeletingId(null);

      if (err) {
        toast.error(err);
      } else {
        toast.success(pick(locale, "Photo deleted", "फोटो हटाइयो"));
        qc.invalidateQueries({ queryKey: ["tenant-gallery", tenant.id] });
      }
    },
    [locale, qc, tenant.id]
  );

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5 mb-6">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <ImageIcon className="text-[var(--brand)]" size={26} />
            {pick(locale, "Photo Gallery", "फोटो ग्यालरी")}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {pick(
              locale,
              "Upload high-quality pictures of your store, team, or past work.",
              "आफ्नो पसल, टोली वा कामको उच्च गुणस्तरको फोटोहरू अपलोड गर्नुहोस्।"
            )}
          </p>
        </div>
      </div>

      {/* Upload Box */}
      <div className="mb-8 rounded-2xl border-2 border-dashed border-[var(--brand)]/40 bg-[var(--surface)] p-6 text-center hover:border-[var(--brand)] transition-colors">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-tint)] text-[var(--brand)] mb-3">
          {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
        </div>
        <h3 className="text-base font-bold text-[var(--ink)]">
          {uploading
            ? pick(locale, "Uploading photos...", "फोटोहरू अपलोड हुँदैछ...")
            : pick(locale, "Upload new photos", "नयाँ फोटोहरू अपलोड गर्नुहोस्")}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {pick(locale, "PNG, JPG, WEBP up to 5MB each. Multiple selection supported.", "PNG, JPG, WEBP (अधिकतम ५MB सम्म)")}
        </p>

        {/* Optional caption before upload */}
        <div className="mt-4 mx-auto max-w-sm flex gap-2">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={pick(locale, "Optional caption (e.g. Interior View)", "वैकल्पिक क्याप्सन")}
            disabled={uploading}
          />
        </div>

        <label className="mt-4 inline-flex items-center gap-2 cursor-pointer rounded-xl bg-[var(--brand)] px-5 py-2.5 font-semibold text-black hover:opacity-90 shadow-sm transition-opacity">
          <Plus size={18} />
          <span>{pick(locale, "Select Files to Upload", "फोटोहरू छान्नुहोस्")}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            className="sr-only"
            onChange={handleUpload}
          />
        </label>
      </div>

      {/* Photos Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-[var(--surface-2)]" />
          ))}
        </div>
      ) : gallery && gallery.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {gallery.map((item) => {
            const url = tenantAssetUrl(item.storage_path);
            const isDeleting = deletingId === item.id;
            return (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] shadow-sm"
              >
                {url ? (
                  <img
                    src={url}
                    alt={item.caption_en || "Gallery image"}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDelete(item.id, item.storage_path)}
                      disabled={isDeleting}
                      className="rounded-lg bg-red-600/90 hover:bg-red-600 p-1.5 text-white shadow-sm transition-colors"
                      title={pick(locale, "Delete photo", "फोटो हटाउनुहोस्")}
                    >
                      {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                  {item.caption_en && (
                    <p className="text-xs text-white/90 truncate font-medium drop-shadow-sm">
                      {item.caption_en}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] p-12 text-center">
          <ImageIcon className="text-[var(--text-muted)] opacity-30 mb-3" size={40} />
          <h3 className="text-base font-semibold">{pick(locale, "Gallery is empty", "ग्यालरी खाली छ")}</h3>
          <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
            {pick(
              locale,
              "Upload photos above to bring your business website to life.",
              "माथिको बक्सबाट फोटो अपलोड गरी आफ्नो वेबसाइटलाई आकर्षक बनाउनुहोस्।"
            )}
          </p>
        </div>
      )}
    </div>
  );
}
