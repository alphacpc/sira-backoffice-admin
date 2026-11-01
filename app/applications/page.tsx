import { mobileApps } from "@/content/apps";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/motion";
import CTABand from "@/components/CTABand";
import CheckList from "@/components/CheckList";
import PhonePreview from "@/components/previews/PhonePreview";
import PhoneFrame from "@/components/PhoneFrame";
import StoreBadge from "@/components/StoreBadge";

const passenger = mobileApps.find((a) => a.name === "Sira Passager")!;
const chauffeur = mobileApps.find((a) => a.name === "Sira Chauffeur & Contrôleur")!;

export default function ApplicationsPage() {
  return (
    <main className="bg-white">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-primary">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#2c3868]/60 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Bientôt disponible
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Votre compagnie, <span className="text-gradient">dans la poche.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/70">
              Deux applications accompagnent la plateforme : l&apos;une pour le
              personnel terrain, l&apos;autre pour les passagers. Sur iOS et
              Android.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <StoreBadge store="apple" />
              <StoreBadge store="google" />
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="relative mx-auto h-[540px] w-full max-w-lg sm:h-[620px]">
              <div className="absolute left-0 top-12 w-52 -rotate-6 sm:w-64">
                <PhoneFrame
                  src="/images/scan-ticket.png"
                  alt="Application chauffeur : contrôle d'un billet par scan"
                />
              </div>
              <div className="absolute right-0 top-0 w-52 rotate-3 sm:w-64">
                <PhoneFrame
                  src="/images/billet.png"
                  alt="Application passager : billet électronique"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Sira Passager ===== */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="flex justify-center">
              <PhonePreview />
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                {passenger.audience}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
                {passenger.name}
              </h2>
              <p className="mt-4 text-lg text-primary/70">
                {passenger.description}
              </p>
              <div className="mt-7">
                <CheckList items={passenger.features} columns={false} />
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <StoreBadge store="apple" tone="light" />
                <StoreBadge store="google" tone="light" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Sira Chauffeur & Contrôleur ===== */}
      <section className="bg-primary/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="lg:order-2">
              <div className="flex justify-center">
                <PhoneFrame
                  src="/images/scan-ticket.png"
                  alt="Application chauffeur : contrôle d'un billet par scan"
                  badge="Contrôle en un scan"
                  className="w-64 sm:w-72"
                />
              </div>
            </Reveal>
            <Reveal delay={0.08} className="lg:order-1">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                  {chauffeur.audience}
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
                  {chauffeur.name}
                </h2>
                <p className="mt-4 text-lg text-primary/70">
                  {chauffeur.description}
                </p>
                <div className="mt-7">
                  <CheckList items={chauffeur.features} columns={false} />
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <StoreBadge store="apple" tone="light" />
                  <StoreBadge store="google" tone="light" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Note de disponibilité ===== */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <div className="flex items-start gap-4 rounded-2xl border border-accent/20 bg-accent/5 p-6">
            <Icon name="bell" className="mt-0.5 h-5 w-5 shrink-0 text-accent-dark" />
            <p className="text-sm leading-relaxed text-primary/70">
              Les applications mobiles ne sont pas encore publiées : elles
              s&apos;appuieront sur la même API que la plateforme web, une fois
              celle-ci stabilisée. Laissez-nous vos coordonnées pour être prévenu
              de leur disponibilité.
            </p>
          </div>
        </Reveal>
      </div>

      {/* ===== CTA ===== */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <CTABand
          title="Envie d'être prévenu ?"
          description="Laissez-nous vos coordonnées pour être informé de la disponibilité des applications."
          primaryLabel="Nous contacter"
        />
      </div>
    </main>
  );
}
