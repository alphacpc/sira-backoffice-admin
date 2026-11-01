import { securitySections } from "@/content/security";
import { Icon } from "@/components/icons";
import CTABand from "@/components/CTABand";
import { Reveal } from "@/components/motion";

export default function SecurityPage() {
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
              Sécurité &amp; conformité
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              Sûre <span className="text-gradient">par conception.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-primary/60">
              Une plateforme qui manipule des paiements et des données
              personnelles se doit d&apos;être sûre par conception. Voici comment
              Sira s&apos;y prend.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Sections ===== */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="space-y-6">
          {securitySections.map((section, index) => (
            <Reveal key={section.title} delay={Math.min(index, 2) * 0.06}>
              <article className="grid gap-6 rounded-3xl border border-primary/10 bg-white p-7 transition hover:border-accent/40 hover:shadow-[var(--shadow-soft)] sm:grid-cols-[auto_1fr] sm:p-8">
                <div className="flex items-center gap-4 sm:flex-col sm:items-start">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                    <Icon
                      name={section.icon}
                      className="h-6 w-6 text-accent-dark"
                    />
                  </span>
                  <span className="text-sm font-bold text-primary/20">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-primary-deep">
                    {section.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-primary/60">
                    {section.description}
                  </p>
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {section.points.map((point) => (
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
          title="La sécurité vous importe ?"
          description="Demandez une démonstration et posez-nous toutes vos questions."
        />
      </div>
    </main>
  );
}
