import Image from "next/image";
import Link from "next/link";
import Hero from "@/components/Hero";
import { Icon } from "@/components/icons";
import { Reveal, Counter, Marquee } from "@/components/motion";
import { services } from "@/content/services";
import { plans, addons } from "@/content/pricing";
import { profiles } from "@/content/solutions";
import { beforeAfter } from "@/content/why-sira";
import { faqItems } from "@/content/faq";

const capabilities = [
  "Gestion de flotte",
  "Billetterie",
  "Colis",
  "Ressources humaines",
  "Facturation SaaS",
  "Mobile money",
  "Multi-tenant",
  "Suivi GPS",
  "Fidélité client",
  "Conformité RGPD",
  "Billet électronique",
];

const steps = [
  {
    title: "Demandez une démo",
    description:
      "Nous parcourons ensemble vos besoins : flotte, lignes, volume d'activité.",
  },
  {
    title: "Choisissez votre plan",
    description:
      "Activez les modules dont vous avez besoin, votre compagnie est configurée.",
  },
  {
    title: "Pilotez votre exploitation",
    description:
      "Votre espace dédié est prêt : flotte, billetterie, colis, RH et facturation.",
  },
];

const stats = [
  { value: 9, label: "domaines métier réunis" },
  { value: 3, label: "canaux de notification" },
  { value: 3, label: "devises gérées" },
  { value: 4, label: "modes de paiement" },
];

const reasons = [
  {
    icon: "boxes",
    title: "Une exploitation unifiée",
    description:
      "Flotte, billetterie, colis, RH et facturation dans un seul espace, activés selon vos besoins.",
  },
  {
    icon: "activity",
    title: "Temps réel, de bout en bout",
    description:
      "Places disponibles, suivi GPS et notifications mises à jour en continu, sans ressaisie.",
  },
  {
    icon: "shield",
    title: "Confiance & conformité",
    description:
      "Isolation stricte entre compagnies, journal d'audit en ajout seul et RGPD intégrés.",
  },
];

const securityPoints = [
  "Isolation stricte : chaque compagnie est un tenant séparé",
  "Journal d'audit en ajout seul, infalsifiable",
  "Consentement explicite et droits des personnes (RGPD)",
  "Secrets protégés, chiffrement et rotation documentée",
  "Backend-first, testé service par service",
  "Database per service, aucune donnée croisée entre compagnies",
];

export default function Home() {
  return (
    <main className="bg-white">
      {/* ===== Hero ===== */}
      <Hero />

      {/* ===== Marquee capacités ===== */}
      <section className="bg-primary/[0.02] py-6">
        <Marquee duration={38}>
          {capabilities.map((item) => (
            <span
              key={item}
              className="mx-6 inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-primary/50"
            >
              <span className="h-1 w-1 rounded-full bg-accent" />
              {item}
            </span>
          ))}
        </Marquee>
      </section>

      {/* ===== Réseau & chiffres clés ===== */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <Image
                src="/images/carte-afrique-transparent.png"
                alt="Carte du réseau de transport interurbain couvert par Sira"
                width={2250}
                height={2430}
                className="h-auto w-full object-contain"
              />
            </Reveal>

            <div>
              <Reveal>
                <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                  Le réseau Sira
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
                  Une plateforme pensée pour l&apos;échelle
                </h2>
                <p className="mt-4 text-primary/60">
                  Un socle unique qui couvre chaque métier, chaque canal et
                  chaque paiement — sans ressaisie, sans outil éparpillé.
                </p>
              </Reveal>

              <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10">
                {stats.map((stat, index) => (
                  <Reveal key={stat.label} delay={index * 0.06}>
                    <p className="text-5xl font-bold tracking-tight text-primary">
                      <Counter value={stat.value} />
                    </p>
                    <p className="mt-2 text-sm text-primary/60">
                      {stat.label}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Proposition de valeur ===== */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Pourquoi Sira
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
              Une seule plateforme. Neuf métiers. Zéro fragmentation.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-primary/60">
              Fini les outils disjoints et le papier. Sira unifie
              l&apos;exploitation sur un socle unique, isolé par compagnie.
            </p>
          </Reveal>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {reasons.map((reason, index) => (
            <Reveal key={reason.title} delay={index * 0.08}>
              <div className="h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Icon name={reason.icon} className="h-6 w-6 text-accent-dark" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-primary">
                  {reason.title}
                </h3>
                <p className="mt-2 text-primary/60">{reason.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Problème → solution ===== */}
      <section className="mx-auto max-w-6xl px-6 py-24">
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

      {/* ===== Pour chaque rôle ===== */}
      <section className="bg-primary/[0.02] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                Cas d&apos;usage
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
                Conçu pour chaque maillon de la compagnie
              </h2>
            </Reveal>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {profiles.map((profile, index) => (
              <Reveal key={profile.slug} delay={index * 0.07}>
                <Link
                  href={`/solutions#${profile.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-6 transition hover:border-accent/50 hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10">
                    <Icon
                      name={profile.icon}
                      className="h-5 w-5 text-accent-dark"
                    />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-primary">
                    {profile.name}
                  </h3>
                  <p className="mt-2 flex-1 text-sm text-primary/60">
                    {profile.summary}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent-dark transition group-hover:gap-2">
                    En savoir plus
                    <Icon name="arrow" className="h-4 w-4" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Plateforme ===== */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                La plateforme
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
                Pilotez toute votre exploitation
              </h2>
              <p className="mt-4 text-primary/60">
                Un tableau de bord unique pour la flotte, la billetterie, les
                colis, les ressources humaines et la facturation — sans changer
                d&apos;outil.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Gestion de flotte et planification des trajets",
                  "Billetterie sans survente et paiement mobile money",
                  "RH, facturation SaaS et conformité intégrées",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-primary/80"
                  >
                    <Icon
                      name="check"
                      className="mt-0.5 h-5 w-5 shrink-0 text-accent-dark"
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/services"
                className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-accent-dark transition hover:gap-2"
              >
                Découvrir la plateforme
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="transition duration-300 hover:-translate-y-1.5">
              <Image
                src="/images/visuel-wow.png"
                alt="Aperçu de la plateforme Sira"
                width={1920}
                height={2400}
                className="h-auto w-full rotate-2 rounded-3xl object-contain shadow-xl"
              />
              <p className="mt-4 text-center text-sm text-primary/50">
                Le tableau de bord de la plateforme Sira
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Applications ===== */}
      <section className="bg-primary/[0.02] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="order-2 lg:order-1">
              <div className="transition duration-300 hover:-translate-y-1.5">
                <Image
                  src="/images/cliente.jpg"
                  alt="Passagère utilisant l'application Sira"
                  width={1920}
                  height={2400}
                  className="h-auto w-full -rotate-2 rounded-3xl object-cover shadow-xl"
                />
                <p className="mt-4 text-center text-sm text-primary/50">
                  L&apos;application passager Sira
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="order-1 lg:order-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                  Les applications
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
                  Sur le terrain et pour les passagers
                </h2>
                <p className="mt-4 text-primary/60">
                  Chauffeurs, contrôleurs et passagers : scanner les billets,
                  suivre les trajets, réserver et suivre un colis depuis un
                  mobile.
                </p>
                <ul className="mt-8 space-y-3">
                  {[
                    "Scan des billets et contrôle des passagers",
                    "Réservation, fidélité et suivi de colis",
                    "Fonctionnement hors-ligne, synchronisé au retour du réseau",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-3 text-primary/80"
                    >
                      <Icon
                        name="check"
                        className="mt-0.5 h-5 w-5 shrink-0 text-accent-dark"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/applications"
                  className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-accent-dark transition hover:gap-2"
                >
                  Découvrir les applications
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Démarrage en 3 étapes ===== */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Démarrage
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
              Lancez-vous en trois étapes
            </h2>
          </Reveal>
        </div>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.08}>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-primary/60">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Confiance & architecture ===== */}
      <section className="relative my-16 overflow-hidden lg:my-20">
        <Image
          src="/images/bus-sunset.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(13,18,38,0.95),rgba(13,18,38,0.72))]" />
        <div className="relative mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                  Conformité & sécurité
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Une infrastructure sur laquelle bâtir
                </h2>
                <p className="mt-4 text-white/70">
                  Sira est conçue pour la réalité réglementaire du transport
                  interurbain : isolation, traçabilité et confidentialité par
                  conception.
                </p>
                <Link
                  href="/securite"
                  className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:gap-2"
                >
                  En savoir plus sur la sécurité
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {securityPoints.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 rounded-xl bg-white p-4 text-sm text-primary/80 shadow-lg"
                  >
                    <Icon
                      name="check"
                      className="mt-0.5 h-5 w-5 shrink-0 text-accent-dark"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <div className="mt-20 flex justify-center">
            <img
              src="/images/sira-horizontal-dark.svg"
              alt="Sira"
              className="h-16 w-auto opacity-90"
            />
          </div>
        </div>
      </section>

      {/* ===== Neuf domaines ===== */}
      <section className="bg-primary/[0.02] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                La plateforme
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
                Neuf domaines, une seule plateforme
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-primary/60">
                Chaque module est indépendant : une compagnie les active
                progressivement, selon ses besoins réels.
              </p>
            </Reveal>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <Reveal key={service.slug} delay={(index % 3) * 0.06}>
                <Link
                  href={`/services#${service.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-6 transition hover:border-accent/50 hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10">
                    <Icon
                      name={service.icon}
                      className="h-5 w-5 text-accent-dark"
                    />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-primary">
                    {service.name}
                  </h3>
                  <p className="mt-2 text-sm text-primary/60">
                    {service.summary}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Tarifs ===== */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Tarifs
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
              Des plans adaptés à votre flotte
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-primary/60">
              Plusieurs niveaux selon la taille de la flotte et le volume
              d&apos;activité.
            </p>
          </Reveal>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 0.08}>
              <div
                className={`relative flex h-full flex-col rounded-3xl p-8 ${
                  plan.highlight
                    ? "bg-accent text-primary-deep shadow-[0_24px_60px_-24px_rgb(13_18_38/0.5)]"
                    : "border border-primary/10 bg-white"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute right-6 top-6 rounded-full bg-primary-deep px-3 py-1 text-xs font-semibold text-accent">
                    Populaire
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p
                  className={`mt-1 text-sm ${
                    plan.highlight ? "text-primary-deep/70" : "text-primary/60"
                  }`}
                >
                  {plan.tagline}
                </p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span
                    className={`text-sm ${
                      plan.highlight ? "text-primary-deep/60" : "text-primary/50"
                    }`}
                  >
                    {plan.period}
                  </span>
                </p>
                <ul className="mt-7 space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Icon
                        name="check"
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          plan.highlight
                            ? "text-primary-deep"
                            : "text-accent-dark"
                        }`}
                      />
                      <span
                        className={
                          plan.highlight
                            ? "text-primary-deep/85"
                            : "text-primary/80"
                        }
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="mx-auto mt-10 max-w-xl text-center text-sm text-primary/45">
            {addons.join(" · ")}
          </p>
          <div className="mt-8 text-center">
            <Link
              href="/tarifs"
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent-dark transition hover:gap-2"
            >
              Voir tous les tarifs
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ===== FAQ teaser ===== */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
              Questions fréquentes
            </h2>
          </Reveal>
        </div>
        <div className="mt-10 space-y-4">
          {faqItems.slice(0, 4).map((item, index) => (
            <Reveal key={item.question} delay={index * 0.05}>
              <div className="rounded-2xl border border-primary/10 bg-white p-6">
                <h3 className="font-semibold text-primary">{item.question}</h3>
                <p className="mt-2 text-sm text-primary/60">{item.answer}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent-dark transition hover:gap-2"
            >
              Voir toutes les questions
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ===== CTA final ===== */}
      <section className="bg-primary">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-24">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Nous gérons la complexité du transport interurbain,
              <br className="hidden sm:block" /> concentrez-vous sur votre
              croissance.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Transformez l&apos;expérience de votre compagnie et de vos
              passagers avec Sira.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className="rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-primary-deep transition hover:bg-accent-dark hover:text-white"
              >
                Demander une démo
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
              >
                Nous contacter
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
