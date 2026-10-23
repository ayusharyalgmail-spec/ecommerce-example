// Services Editor — manage offerings, services, or catalog items for the business.
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT, pick } from "@/lib/i18n";
import { useManagedTenant } from "./useManagedTenant";
import { useTenantServices, tenantAssetUrl } from "@/platform/queries";
import { saveService, deleteService, uploadServiceImage } from "@/platform/api";
import type { TenantService } from "@/platform/TenantContext";
import { Button, Field, Input, Textarea } from "@/ui";
import { toast } from "@/ui/toast";
import { ShoppingBag, Plus, Trash2, Edit2, Upload, DollarSign, Image as ImageIcon, X } from "lucide-react";

export default function ServicesEditor() {
  const tenant = useManagedTenant();
  const { locale } = useT();
  const qc = useQueryClient();
  const { data: services, isLoading } = useTenantServices(tenant.id);

  const [editingService, setEditingService] = useState<TenantService | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Form state
  const [nameEn, setNameEn] = useState("");
  const [nameNe, setNameNe] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descNe, setDescNe] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");

  const startCreate = () => {
    setEditingService(null);
    setNameEn("");
    setNameNe("");
    setDescEn("");
    setDescNe("");
    setPriceDisplay("");
    setIsCreating(true);
  };

  const startEdit = (s: TenantService) => {
    setIsCreating(false);
    setEditingService(s);
    setNameEn(s.name_en);
    setNameNe(s.name_ne || "");
    setDescEn(s.description_en || "");
    setDescNe(s.description_ne || "");
    setPriceDisplay(s.price_display || "");
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingService(null);
  };

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) {
      toast.error(pick(locale, "Service name is required", "सेवाको नाम आवश्यक छ"));
      return;
    }

    setSaving(true);
    const res = await saveService(
      tenant.id,
      {
        name_en: nameEn,
        name_ne: nameNe,
        description_en: descEn,
        description_ne: descNe,
        price_display: priceDisplay,
      },
      editingService ? editingService.id : undefined
    );
    setSaving(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(
        editingService
          ? pick(locale, "Service updated!", "सेवा परिमार्जन भयो!")
          : pick(locale, "Service added!", "सेवा थपियो!")
      );
      closeForm();
      qc.invalidateQueries({ queryKey: ["tenant-services", tenant.id] });
    }
  }, [tenant.id, nameEn, nameNe, descEn, descNe, priceDisplay, editingService, locale, qc]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(pick(locale, "Are you sure you want to delete this service?", "के तपाईं यो सेवा हटाउन निश्चित हुनुहुन्छ?"))) {
      return;
    }
    const err = await deleteService(id);
    if (err) {
      toast.error(err);
    } else {
      toast.success(pick(locale, "Service deleted", "सेवा हटाइयो"));
      qc.invalidateQueries({ queryKey: ["tenant-services", tenant.id] });
    }
  }, [tenant.id, locale, qc]);

  const handleImageUpload = useCallback(async (serviceId: string, file: File) => {
    setUploadingId(serviceId);
    const res = await uploadServiceImage(tenant.id, serviceId, file);
    setUploadingId(null);
    if ("error" in res) {
      toast.error(res.error);
    } else {
      toast.success(pick(locale, "Image uploaded!", "फोटो अपलोड भयो!"));
      qc.invalidateQueries({ queryKey: ["tenant-services", tenant.id] });
    }
  }, [tenant.id, locale, qc]);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5 mb-6">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <ShoppingBag className="text-[var(--brand)]" size={26} />
            {pick(locale, "Services & Products", "सेवा तथा उत्पादनहरू")}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {pick(
              locale,
              "Manage the offerings displayed on your public business page.",
              "तपाईंको व्यवसायिक पृष्ठमा देखिने सेवा तथा सामानहरू व्यवस्थापन गर्नुहोस्।"
            )}
          </p>
        </div>
        {!isCreating && !editingService && (
          <Button onClick={startCreate} className="gap-2 self-start sm:self-auto">
            <Plus size={18} />
            {pick(locale, "Add Service", "सेवा थप्नुहोस्")}
          </Button>
        )}
      </div>

      {/* Form modal/drawer when creating or editing */}
      {(isCreating || editingService) && (
        <div className="mb-8 rounded-2xl border border-[var(--brand)]/30 bg-[var(--surface)] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-5">
            <h2 className="text-lg font-bold">
              {isCreating
                ? pick(locale, "New Service", "नयाँ सेवा")
                : pick(locale, "Edit Service", "सेवा सम्पादन")}
            </h2>
            <button
              onClick={closeForm}
              className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={pick(locale, "Service Name (English)*", "सेवाको नाम (अंग्रेजी)*")}>
                {(p) => (
                  <Input
                    {...p}
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Wedding Photography, Men's Haircut"
                    required
                  />
                )}
              </Field>
              <Field label={pick(locale, "Service Name (Nepali)", "सेवाको नाम (नेपाली)")}>
                {(p) => (
                  <Input
                    {...p}
                    value={nameNe}
                    onChange={(e) => setNameNe(e.target.value)}
                    placeholder="जस्तै: कपाल काट्ने, विवाह फोटोग्राफी"
                  />
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={pick(locale, "Price / Rate Display", "मूल्य प्रदर्शन")}>
                {(p) => (
                  <Input
                    {...p}
                    value={priceDisplay}
                    onChange={(e) => setPriceDisplay(e.target.value)}
                    placeholder="e.g. Rs. 500, Rs. 1,500/hr, Contact for quote"
                  />
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={pick(locale, "Description (English)", "विवरण (अंग्रेजी)")}>
                {(p) => (
                  <Textarea
                    {...p}
                    rows={3}
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    placeholder="Describe what's included, duration, etc."
                  />
                )}
              </Field>
              <Field label={pick(locale, "Description (Nepali)", "विवरण (नेपाली)")}>
                {(p) => (
                  <Textarea
                    {...p}
                    rows={3}
                    value={descNe}
                    onChange={(e) => setDescNe(e.target.value)}
                    placeholder="सेवाको छोटो विवरण..."
                  />
                )}
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--line)]">
              <Button type="button" variant="ghost" onClick={closeForm}>
                {pick(locale, "Cancel", "रद्द गर्नुहोस्")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? pick(locale, "Saving...", "बचत गर्दै...") : pick(locale, "Save Service", "सेवा सेभ गर्नुहोस्")}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Services List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
          ))}
        </div>
      ) : services && services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((s) => {
            const imgUrl = tenantAssetUrl(s.image_path);
            return (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm hover:border-[var(--brand)]/40 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Service image thumbnail or upload trigger */}
                  <div className="relative group h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-2)] flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={s.name_en} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="text-[var(--text-muted)] opacity-40" size={24} />
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload className="text-white" size={18} />
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploadingId === s.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(s.id, file);
                        }}
                      />
                    </label>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[var(--ink)] truncate">
                      {locale === "ne" && s.name_ne ? s.name_ne : s.name_en}
                    </h3>
                    {s.price_display && (
                      <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--brand-tint)] text-[var(--brand-strong)]">
                        {s.price_display}
                      </span>
                    )}
                    <p className="mt-1.5 text-xs text-[var(--text-muted)] line-clamp-2">
                      {locale === "ne" && s.description_ne ? s.description_ne : s.description_en || pick(locale, "No description", "विवरण छैन")}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 border-t border-[var(--line)]/60 pt-3 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(s)}
                    className="gap-1.5 text-xs"
                  >
                    <Edit2 size={14} />
                    {pick(locale, "Edit", "सम्पादन")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(s.id)}
                    className="gap-1.5 text-xs text-[var(--danger)] hover:bg-[var(--danger-tint)]"
                  >
                    <Trash2 size={14} />
                    {pick(locale, "Delete", "मेटाउनुहोस्")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] p-12 text-center">
          <ShoppingBag className="text-[var(--text-muted)] opacity-30 mb-3" size={40} />
          <h3 className="text-base font-semibold">{pick(locale, "No services added yet", "कुनै सेवा थपिएको छैन")}</h3>
          <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
            {pick(
              locale,
              "Add your first service or product so visitors know what your business offers.",
              "आफ्नो पहिलो सेवा वा उत्पादन थप्नुहोस् ताकि ग्राहकहरूले थाहा पाउन सकून्।"
            )}
          </p>
          <Button onClick={startCreate} className="mt-4 gap-2">
            <Plus size={16} />
            {pick(locale, "Add Your First Service", "पहिलो सेवा थप्नुहोस्")}
          </Button>
        </div>
      )}
    </div>
  );
}
