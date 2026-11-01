import { Icon } from "@/components/icons";
import CTABand from "@/components/CTABand";
import { Reveal } from "@/components/motion";
import PresenceMap from "@/components/PresenceMap";
import { presenceLocations } from "@/content/presence";

export default function NetworkPage() {
  return (
    <main className="bg-white">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgb(245_165_36/0.12),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-12 pt-20 sm:pt-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Réseau
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              Notre présence en{" "}
              <span className="text-gradient">Afrique de l&apos;Ouest.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-primary/60">
              Trois hubs — Dakar, Conakry et Abidjan — et des compagnies de
              transport qui nous font confiance pour digitaliser leur
              exploitation.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Carte ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <Reveal>
          <PresenceMap locations={presenceLocations} />
        </Reveal>
      </section>

      {/* ===== Détail par pays ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {presenceLocations.map((loc, index) => (
            <Reveal key={loc.id} delay={index * 0.07} className="h-full">
              <article className="flex h-full flex-col rounded-3xl border border-primary/10 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10">
                    <Icon name="map-pin" className="h-5 w-5 text-accent-dark" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                      {loc.country}
                    </p>
                    <h2 className="text-lg font-semibold text-primary">
                      {loc.city}
                    </h2>
                  </div>
                </div>

                <div className="mt-5 border-t border-primary/10 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/40">
                    Gares
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {loc.stations.map((station) => (
                      <li
                        key={station}
                        className="flex items-start gap-2.5 text-sm text-primary/80"
                      >
                        <Icon
                          name="map-pin"
                          className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark"
                        />
                        {station}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 border-t border-primary/10 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/40">
                    Compagnies qui nous font confiance
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {loc.companies.map((company) => (
                      <li
                        key={company}
                        className="flex items-start gap-2.5 text-sm text-primary/80"
                      >
                        <Icon
                          name="building"
                          className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark"
                        />
                        {company}
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
          title="Rejoindre le réseau Sira ?"
          description="Discutons de vos lignes, gares et hubs lors d'une démonstration."
        />
      </div>
    </main>
  );
}
