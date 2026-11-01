import Link from "next/link";
import { Icon } from "@/components/icons";
import PaymentMethods from "@/components/PaymentMethods";
import CTABand from "@/components/CTABand";
import { Reveal } from "@/components/motion";
import { plans, addons, pricingNote } from "@/content/pricing";

const addonIcons = ["boxes", "navigation", "credit-card", "code"];

export default function PricingPage() {
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
              Tarifs
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              Un plan pour <span className="text-gradient">chaque étape.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-primary/60">
              Des plans adaptés à la taille de la flotte et au volume
              d&apos;activité. Activez les modules dont vous avez besoin et
              évoluez de plan à tout moment.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Plans ===== */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {plans.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 0.08} className="h-full">
              <article
                className={`relative flex h-full flex-col rounded-3xl p-8 transition duration-300 ${
                  plan.highlight
                    ? "bg-primary text-white shadow-[0_32px_80px_-32px_rgb(13_18_38/0.55)] lg:-translate-y-3"
                    : "border border-primary/10 bg-white hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
                }`}
              >
                {plan.highlight && (
                  <>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 -top-px h-40 rounded-t-3xl bg-[radial-gradient(ellipse_at_top,rgb(245_165_36/0.18),transparent_70%)]"
                    />
                    <span className="absolute right-6 top-6 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary-deep">
                      Populaire
                    </span>
                  </>
                )}

                <h2
                  className={`text-lg font-semibold ${
                    plan.highlight ? "text-white" : "text-primary"
                  }`}
                >
                  {plan.name}
                </h2>
                <p
                  className={`mt-1 text-sm ${
                    plan.highlight ? "text-white/70" : "text-primary/60"
                  }`}
                >
                  {plan.tagline}
                </p>

                <p className="mt-6 flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-bold tracking-tight ${
                      plan.highlight ? "text-white" : "text-primary-deep"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.highlight ? "text-white/70" : "text-primary/50"
                    }`}
                  >
                    {plan.period}
                  </span>
                </p>

                <ul className="mt-7 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-start gap-2.5 text-sm ${
                        plan.highlight ? "text-white/90" : "text-primary/80"
                      }`}
                    >
                      <Icon
                        name="check"
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          plan.highlight ? "text-accent" : "text-accent-dark"
                        }`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.missing.length > 0 && (
                  <ul
                    className={`mt-5 space-y-2 border-t pt-5 ${
                      plan.highlight ? "border-white/10" : "border-primary/10"
                    }`}
                  >
                    {plan.missing.map((item) => (
                      <li
                        key={item}
                        className={`flex items-start gap-2.5 text-sm ${
                          plan.highlight ? "text-white/45" : "text-primary/40"
                        }`}
                      >
                        <Icon
                          name="x"
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            plan.highlight ? "text-white/30" : "text-primary/25"
                          }`}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href="/contact"
                  className={`mt-8 rounded-full px-6 py-3 text-center text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-accent text-primary-deep hover:bg-accent-dark hover:text-white"
                      : "border border-primary/20 text-primary hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  Demander une démo
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== À la carte ===== */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl">
            Fonctionnalités à la carte
          </h2>
          <p className="mt-2 max-w-2xl text-primary/60">
            Des modules complémentaires à activer selon votre plan.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {addons.map((addon, index) => (
            <Reveal key={addon} delay={index * 0.06}>
              <div className="group flex h-full flex-col gap-3 rounded-2xl border border-primary/10 bg-white p-5 transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 transition group-hover:bg-accent/15">
                  <Icon
                    name={addonIcons[index] ?? "boxes"}
                    className="h-5 w-5 text-accent-dark"
                  />
                </div>
                <p className="text-sm text-primary/80">{addon}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Paiement ===== */}
      <section className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="rounded-3xl border border-primary/10 bg-primary/[0.02] p-8 sm:p-10">
            <PaymentMethods title="Paiement des abonnements et des billets" />
          </div>
        </Reveal>
      </section>

      {/* ===== Note ===== */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Reveal>
          <div className="flex items-start gap-4 rounded-2xl border border-accent/20 bg-accent/5 p-6">
            <Icon
              name="scroll"
              className="mt-0.5 h-5 w-5 shrink-0 text-accent-dark"
            />
            <p className="text-sm leading-relaxed text-primary/70">
              {pricingNote}
            </p>
          </div>
        </Reveal>
      </div>

      {/* ===== CTA ===== */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <CTABand
          title="Besoin d'un plan sur mesure ?"
          description="Le volume de votre flotte ne rentre dans aucune case ? Parlons-en."
          primaryLabel="Demander une démo"
          secondaryHref="/faq"
          secondaryLabel="Voir la FAQ"
        />
      </div>
    </main>
  );
}
