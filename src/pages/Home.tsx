import { Link, useNavigate } from "react-router-dom";
import { Search } from "@/ui";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useT, pick } from "@/lib/i18n";
import { useQuery } from "@/lib/useQuery";
import { useCategories } from "@/lib/queries";
import { CARD_COLUMNS, ProductCard, type CardProduct } from "@/components/Product";
import { Loading, useTitle } from "@/components/ui";

export default function Home() {
  const { t, locale } = useT();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  useTitle(t("nav.home"));
  const cats = useCategories();
  const prods = useQuery(async () => ((await supabase.from("products").select(CARD_COLUMNS).eq("status", "published").order("published_at", { ascending: false }).limit(12)).data ?? []) as CardProduct[], []);
  const data = prods.data && cats.data ? { products: prods.data, categories: cats.data } : undefined;
  const loading = prods.loading || cats.isFetching;

  return (
    <main className="container-page space-y-8">
      <form className="flex gap-2" role="search" onSubmit={(e) => { e.preventDefault(); nav(`/shop?q=${encodeURIComponent(q)}`); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("shop.search")} aria-label={t("shop.search")} />
        <button className="btn btn-primary" aria-label={t("shop.search")}><Search aria-hidden size={24} strokeWidth={1.75} /></button>
      </form>

      {loading && !data ? <Loading /> : data && (
        <>
          {!!data.categories.length && (
            <section aria-labelledby="cats">
              <h2 id="cats" className="mb-3 text-2xl font-semibold">{t("home.categories")}</h2>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {data.categories.map((c) => (
                  <li key={c.id}><Link className="btn btn-secondary" to={`/shop?category=${c.slug}`}>{pick(locale, c.name_en, c.name_ne)}</Link></li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="new">
            <h2 id="new" className="mb-3 text-2xl font-semibold">{t("home.new")}</h2>
            {data.products.length ? (
              <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-4">
                {data.products.map((p) => <ProductCard key={p.id} p={p} locale={locale} />)}
              </ul>
            ) : <p className="muted">{t("home.empty")}</p>}
          </section>
        </>
      )}
    </main>
  );
}
