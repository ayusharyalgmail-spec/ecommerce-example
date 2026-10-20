import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { moderateReview } from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import { Loading, useTitle } from "@/components/ui";

export default function Reviews() {
  const { t } = useT();
  useTitle(t("admin.reviews"));
  const { data, loading, reload } = useQuery(async () =>
    (await supabase.from("reviews").select("id,rating,title,body,author_name,products(name_en)").eq("status", "pending").order("created_at")).data ?? [], []);
  if (loading && !data) return <Loading />;
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">{t("admin.reviews")}</h1>
      {data?.length ? (
        <ul className="m-0 list-none space-y-3 p-0">
          {data.map((r) => (
            <li key={r.id} className="card space-y-2">
              <p className="m-0 font-medium">{(r.products as unknown as { name_en: string } | null)?.name_en} · {"★".repeat(r.rating)}</p>
              <p className="m-0">{r.title} {r.body}</p>
              <p className="muted m-0 text-xs">{r.author_name}</p>
              <div className="flex gap-2">
                {(["approved", "rejected", "hidden"] as const).map((d) => (
                  <button key={d} className={`btn ${d === "approved" ? "btn-primary" : "btn-secondary"} !py-1 text-sm`} onClick={async () => { await moderateReview(r.id, d); reload(); }}>
                    {t(d === "approved" ? "admin.approve" : d === "rejected" ? "admin.reject" : "admin.hide")}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="muted">—</p>}
    </main>
  );
}
