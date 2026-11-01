import CTABand from "@/components/CTABand";
import { differentiators, beforeAfter } from "@/content/why-sira";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/motion";

export default function WhySiraPage() {
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
              Pourquoi Sira
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              Conçue pour <span className="text-gradient">l&apos;Afrique de l&apos;Ouest.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-primary/60">
              Sira n&apos;est pas un énième outil de billetterie. C&apos;est une
              plateforme pensée pour les compagnies de transport interurbain
              d&apos;Afrique de l&apos;Ouest, qui unifie l&apos;exploitation et
              protège les données par construction.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Différenciateurs ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {differentiators.map((item, index) => (
            <Reveal key={item.title} delay={(index % 3) * 0.07} className="h-full">
              <article className="group relative h-full overflow-hidden rounded-2xl border border-primary/10 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-soft)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgb(245_165_36/0.08),transparent_60%)] opacity-0 transition duration-300 group-hover:opacity-100"
                />
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 transition duration-300 group-hover:scale-105 group-hover:bg-accent/15">
                    <Icon name={item.icon} className="h-5 w-5 text-accent-dark" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-primary">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm text-primary/60">
                    {item.description}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Avant / Après ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-primary/10 bg-white p-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary/50">
                Aujourd&apos;hui
              </p>
              <ul className="mt-6 space-y-4">
                {beforeAfter.map((row) => (
                  <li
                    key={row.before}
                    className="flex items-start gap-3 text-primary/60"
                  >
                    <Icon
                      name="x"
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary/30"
                    />
                    {row.before}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-3xl bg-primary p-8 text-white">
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                Avec Sira
              </p>
              <ul className="mt-6 space-y-4">
                {beforeAfter.map((row) => (
                  <li
                    key={row.after}
                    className="flex items-start gap-3 text-white/90"
                  >
                    <Icon
                      name="check"
                      className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                    />
                    {row.after}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <CTABand
          title="Envie de voir par vous-même ?"
          description="Demandez une démonstration et découvrez ce que Sira peut changer pour votre compagnie."
        />
      </div>
    </main>
  );
}
