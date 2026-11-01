import { benefitGroups } from "@/content/companies";
import { Icon } from "@/components/icons";
import CTABand from "@/components/CTABand";
import { Reveal } from "@/components/motion";

const groupIcons = ["boxes", "ticket", "gauge", "heart", "shield", "users"];

export default function CompaniesPage() {
  return (
    <main className="bg-white">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgb(245_165_36/0.12),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-20 sm:pt-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Compagnies de transport
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              Moins de papier, <span className="text-gradient">plus de contrôle.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-primary/60">
              Ce que Sira change concrètement pour une compagnie de transport
              interurbain : moins de papier, moins d&apos;erreurs, plus de
              visibilité, et des données protégées.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Bénéfices ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefitGroups.map((group, index) => (
            <Reveal key={group.title} delay={(index % 3) * 0.07} className="h-full">
              <article className="group relative h-full overflow-hidden rounded-2xl border border-primary/10 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-soft)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgb(245_165_36/0.08),transparent_60%)] opacity-0 transition duration-300 group-hover:opacity-100"
                />
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 transition duration-300 group-hover:scale-105 group-hover:bg-accent/15">
                    <Icon
                      name={groupIcons[index] ?? "boxes"}
                      className="h-5 w-5 text-accent-dark"
                    />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-primary">
                    {group.title}
                  </h2>
                  <p className="mt-2 text-sm text-primary/60">
                    {group.description}
                  </p>
                  <ul className="mt-4 space-y-2.5 border-t border-primary/10 pt-4">
                    {group.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2.5 text-sm text-primary/80"
                      >
                        <Icon
                          name="check"
                          className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <CTABand
          title="Par où commencer ?"
          description="Une démonstration permet d'identifier les modules pertinents pour votre compagnie et d'établir une proposition adaptée."
          primaryLabel="Demander une démo"
          secondaryHref="/tarifs"
          secondaryLabel="Voir les tarifs"
        />
      </div>
    </main>
  );
}
