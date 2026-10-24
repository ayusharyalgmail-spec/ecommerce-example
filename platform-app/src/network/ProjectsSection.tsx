// Projects section — shows the projects built on this platform (see projects.ts).
import { ExternalLink } from "@/ui/icons";
import { useT, pick } from "@/lib/i18n";
import { NETWORK_PROJECTS } from "@/network/projects";

export default function ProjectsSection() {
  const { locale } = useT();

  return (
    <section id="projects" className="mx-auto max-w-5xl px-4 pb-20">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">
          {pick(locale, "Projects", "परियोजनाहरू")}
        </h2>
        <p className="mt-2 text-[var(--text-muted)]">
          {pick(locale, "Websites and tools built for this network", "यो नेटवर्कका लागि बनाइएका वेबसाइट र उपकरणहरू")}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {NETWORK_PROJECTS.map((project) => (
          <article key={project.id} className="flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition-shadow hover:shadow-e2">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold">{pick(locale, project.name, project.name_ne)}</h3>
              <span className="shrink-0 rounded-full bg-[var(--brand-tint)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                {project.status === "live"
                  ? pick(locale, "Live", "प्रत्यक्ष")
                  : pick(locale, "In development", "विकासमा")}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {pick(locale, project.description, project.description_ne)}
            </p>

            <ul className="mt-4 flex flex-wrap gap-2" aria-label={pick(locale, "Technologies", "प्रविधिहरू")}>
              {project.tags.map((tag) => (
                <li key={tag} className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                  {tag}
                </li>
              ))}
            </ul>

            {project.href && (
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 self-start text-sm font-semibold text-[var(--brand-strong)] hover:underline"
              >
                {pick(locale, "Visit project", "परियोजना हेर्नुहोस्")}
                <ExternalLink size={14} />
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
