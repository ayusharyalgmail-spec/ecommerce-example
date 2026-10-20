import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/useQuery";
import { CARD_COLUMNS, ProductCard, WishlistButton, type CardProduct } from "@/components/Product";
import { Loading, useTitle } from "@/components/ui";

export default function Wishlist() {
  const { t, locale } = useT();
  const { user } = useAuth();
  useTitle(t("wish.title"));
  const { data, loading } = useQuery(async () => {
    const { data } = await supabase.from("wishlists").select(`products(${CARD_COLUMNS},status)`).eq("user_id", user!.id).order("created_at", { ascending: false });
    return (data ?? []).map((w) => w.products as unknown as CardProduct & { status: string }).filter((p) => p && p.status === "published");
  }, [user?.id]);
  if (loading && !data) return <Loading />;
  return (
    <main className="container-page space-y-4">
      <h1 className="text-3xl font-bold">{t("wish.title")}</h1>
      {data?.length ? (
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-4">
          {data.map((p) => (
            <div key={p.id} className="space-y-2">
              <ProductCard p={p} locale={locale} />
              <WishlistButton productId={p.id} initial />
            </div>
          ))}
        </ul>
      ) : <p className="muted">{t("wish.empty")}</p>}
    </main>
  );
}
