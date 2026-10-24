// About Platform — tells the story of the Local Business Network and how local businesses benefit.
import { Link } from "react-router-dom";
import { useT, pick } from "@/lib/i18n";
import { usePlatformSettings } from "@/platform/queries";
import { Globe, Smartphone, ShieldCheck, ArrowRight, HeartHandshake } from "@/ui/icons";

export default function AboutPlatform() {
  const { locale } = useT();
  const { data: settings } = usePlatformSettings();
  const networkName = settings?.network_name ?? "Dumarwana";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      {/* Hero */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/30 bg-[var(--brand-tint)] px-4 py-1.5 text-xs font-semibold text-[var(--brand-strong)]">
          <HeartHandshake size={14} />
          {pick(locale, "Empowering Local Communities", "स्थानीय समुदायलाई सशक्त बनाउँदै")}
        </span>
        <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--ink)]">
          {pick(
            locale,
            `Connecting Every Business in ${networkName}`,
            `${networkName}का प्रत्येक व्यवसायलाई अनलाइन जोड्दै`
          )}
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-[var(--text-muted)]">
          {pick(
            locale,
            "We believe small and medium businesses are the heartbeat of our town. Our mission is to give every local shop, clinic, salon, and craftsman a high-speed, mobile-optimized online presence.",
            "साना तथा मझौला व्यवसायहरू हाम्रो सहरको मुटु हुन्। हाम्रो उद्देश्य प्रत्येक स्थानीय पसल, क्लिनिक र सेवा प्रदायकलाई गुणस्तरीय अनलाइन पहिचान दिनु हो।"
          )}
        </p>
      </div>

      {/* Pillars */}
      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-tint)] text-[var(--brand)] mb-4">
            <Smartphone size={24} />
          </div>
          <h3 className="text-lg font-bold text-[var(--ink)]">
            {pick(locale, "Mobile First & Lightning Fast", "मोबाइल-मैत्री तथा द्रुत गतिको")}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {pick(
              locale,
              "Optimized for 3G/4G connections across Nepal. Loads in under a second with seamless touch interactions.",
              "नेपालका ३G/४G नेटवर्कहरूमा पनि १ सेकेन्डभित्र खुल्ने गरी बनाइएको।"
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 mb-4">
            <Globe size={24} />
          </div>
          <h3 className="text-lg font-bold text-[var(--ink)]">
            {pick(locale, "Bilingual in Nepali & English", "नेपाली र अंग्रेजी दुवै भाषामा")}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {pick(
              locale,
              "One-click language toggle so customers can read in Nepali or English effortlessly.",
              "ग्राहकहरूले सजिलैसँग एक क्लिकमा नेपाली वा अंग्रेजी भाषा छनोट गर्न सक्ने।"
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 mb-4">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-lg font-bold text-[var(--ink)]">
            {pick(locale, "Owned & Managed by You", "तपाईंको आफ्नै नियन्त्रणमा")}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {pick(
              locale,
              "Update photos, business hours, services, and pricing directly from your phone in seconds.",
              "आफ्नो मोबाइलबाटै फोटो, खुल्ने समय, सेवा तथा मूल्य तुरुन्तै फेरबदल गर्नुहोस्।"
            )}
          </p>
        </div>
      </div>

      {/* CTA Box */}
      <div className="mt-14 rounded-3xl border border-[var(--brand)]/30 bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] p-8 text-center shadow-lg">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--ink)]">
          {pick(locale, "Ready to get your business online?", "आफ्नो व्यवसायलाई अनलाइन लैजान तयार हुनुहुन्छ?")}
        </h2>
        <p className="mt-2 max-w-lg mx-auto text-sm text-[var(--text-muted)]">
          {pick(
            locale,
            "Join our thriving local network and start receiving direct inquiries from nearby customers today.",
            "हाम्रो स्थानीय नेटवर्कमा सामेल हुनुहोस् र नजिकका ग्राहकहरूबाट सोधपुछ प्राप्त गर्न सुरु गर्नुहोस्।"
          )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3 font-bold text-black shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            <span>{pick(locale, "Join the Network", "नेटवर्कमा जोडिनुहोस्")}</span>
            <ArrowRight size={18} />
          </Link>
          <Link
            to="/network"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-6 py-3 font-semibold text-[var(--ink)] hover:border-[var(--brand)]"
          >
            {pick(locale, "Explore Directory", "व्यवसाय सूची हेर्नुहोस्")}
          </Link>
        </div>
      </div>
    </div>
  );
}
