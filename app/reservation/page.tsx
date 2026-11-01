import Link from "next/link";
import { Icon } from "@/components/icons";
import PaymentMethods from "@/components/PaymentMethods";
import CTABand from "@/components/CTABand";
import { Reveal } from "@/components/motion";
import PhonePreview from "@/components/previews/PhonePreview";
import PhoneFrame from "@/components/PhoneFrame";
import { reservationSteps } from "@/content/reservation";

const stepIcons = ["route", "bus", "credit-card", "ticket", "badge-check"];

export default function ReservationPage() {
  return (
    <main className="bg-white">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgb(245_165_36/0.12),transparent_70%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-20 sm:pt-24 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Réservation
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              Réservez en <span className="text-gradient">quelques secondes.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-primary/60">
              De la recherche du trajet à l&apos;embarquement, le parcours de
              réservation tel que Sira le rend possible — pour le passager comme
              pour l&apos;agent au guichet.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex justify-center">
              <PhonePreview />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Parcours en 5 étapes ===== */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Le parcours
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl">
            De la recherche à l&apos;embarquement
          </h2>
        </Reveal>

        <ol className="relative mt-10 space-y-6">
          <div
            aria-hidden="true"
            className="absolute bottom-8 left-6 top-2 w-px bg-primary/10"
          />
          {reservationSteps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06}>
              <li className="relative flex gap-5">
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
                  <Icon
                    name={stepIcons[index] ?? "check"}
                    className="h-5 w-5 text-accent-dark"
                  />
                </div>
                <div className="flex-1 rounded-2xl border border-primary/10 bg-white p-6 transition hover:border-accent/40 hover:shadow-[var(--shadow-soft)]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-xl font-semibold text-primary">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-primary/60">{step.description}</p>
                  <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {step.details.map((detail) => (
                      <li
                        key={detail}
                        className="flex items-start gap-2.5 text-sm text-primary/80"
                      >
                        <Icon
                          name="check"
                          className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark"
                        />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ===== Sans survente ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <Reveal>
          <div className="grid overflow-hidden rounded-3xl bg-primary lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                Zéro survente
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Une réservation sans survente
              </h2>
              <p className="mt-4 text-white/70">
                La disponibilité des places est mise à jour de façon atomique :
                une place réservée ne peut pas être vendue une seconde fois. Le
                billet électronique est émis à la confirmation du paiement et
                vérifiable par scan.
              </p>
              <Link
                href="/services#reservation-billetterie"
                className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:gap-2"
              >
                Voir le module Réservation &amp; billetterie
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative hidden items-center justify-center overflow-hidden lg:flex">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(245_165_36/0.12),transparent_65%)]"
              />
              <PhoneFrame
                src="/images/sieges.png"
                alt="Choix du siège via le plan du bus"
                className="relative w-56 py-10"
              />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== Paiement ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <Reveal>
          <div className="rounded-3xl border border-primary/10 bg-primary/[0.02] p-8 sm:p-10">
            <PaymentMethods title="Moyens de paiement à l'embarquement" />
          </div>
        </Reveal>
      </section>

      {/* ===== CTA ===== */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <CTABand
          title="Prêt à vendre des billets en ligne ?"
          description="Demandez une démonstration du parcours de réservation complet."
        />
      </div>
    </main>
  );
}
