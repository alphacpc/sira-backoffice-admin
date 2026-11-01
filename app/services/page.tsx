import Image from "next/image";
import { services } from "@/content/services";
import { Icon } from "@/components/icons";
import CTABand from "@/components/CTABand";
import { Reveal, Marquee } from "@/components/motion";
import ScrollStory from "@/components/ScrollStory";
import DashboardPreview from "@/components/previews/DashboardPreview";
import PhonePreview from "@/components/previews/PhonePreview";

const groups = [
  {
    id: "socle",
    eyebrow: "Fondations",
    title: "Le socle commun",
    slugs: ["identite-acces", "compagnies-facturation", "conformite-supervision"],
  },
  {
    id: "exploitation",
    eyebrow: "Exploitation",
    title: "Le cœur du métier",
    slugs: ["flotte", "reservation-billetterie", "colis"],
  },
  {
    id: "relation",
    eyebrow: "Équipe & clients",
    title: "La relation",
    slugs: ["ressources-humaines", "notifications", "clients-fidelite"],
  },
];

const serviceBySlug = new Map(services.map((s) => [s.slug, s]));

const steps = [
  {
    eyebrow: "La plateforme",
    title: "Un socle, neuf modules",
    description:
      "Flotte, billetterie, colis, RH et facturation réunis dans un seul espace — isolé par compagnie.",
    points: [
      "Flotte, billetterie, colis, RH et facturation réunis",
      "Chaque module activé indépendamment, à la carte",
      "Données isolées par compagnie, par construction",
    ],
    bg: "linear-gradient(135deg, #1e2749 0%, #141a36 100%)",
  },
  {
    eyebrow: "Pilotez",
    title: "Pilotez votre exploitation",
    description:
      "Flotte, ventes, colis et personnel : un tableau de bord unique, en temps réel.",
    points: [
      "Trajets, réservations et colis en temps réel",
      "Revenus et activité sur un tableau de bord unique",
      "Affectation des chauffeurs et contrôleurs",
    ],
    bg: "linear-gradient(135deg, #2a3a7a 0%, #1a2244 100%)",
  },
  {
    eyebrow: "Vendez",
    title: "Vendez sans survente",
    description:
      "Réservation atomique, paiement mobile money et billet contrôlable par scan.",
    points: [
      "Places mises à jour de façon atomique",
      "Paiement mobile money (Orange Money, Wave…)",
      "Billet électronique vérifiable par scan",
    ],
    bg: "linear-gradient(135deg, #4a3413 0%, #1e2749 100%)",
  },
  {
    eyebrow: "Fidélisez",
    title: "Fidélisez vos passagers",
    description:
      "Profil client, parrainage, fidélité et notifications à chaque étape du voyage.",
    points: [
      "Profil client et programme de fidélité",
      "Parrainage entre passagers",
      "Notifications email, SMS et in-app",
    ],
    bg: "linear-gradient(135deg, #0d1226 0%, #1e2749 100%)",
  },
];

/** Mosaïque des 9 modules (étape d'introduction). */
function ModuleMosaic() {
  return (
    <div className="w-full max-w-[320px] rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:max-w-md">
      <img src="/images/sira-icon-dark.svg" alt="Logo Sira" className="h-9 w-auto" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        {services.map((service) => (
          <div
            key={service.slug}
            className="flex aspect-square items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10"
          >
            <Icon name={service.icon} className="h-6 w-6 text-accent" />
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-sm font-medium text-white/60">
        9 modules · 1 socle
      </p>
    </div>
  );
}

export default function ServicesPage() {
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
              Services
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              Neuf modules, <span className="text-gradient">un socle unique.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-primary/60">
              Neuf domaines réunis sur un même socle, activables à la carte selon
              vos besoins — sans déploiement monolithique.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Bande défilante ===== */}
      <section className="bg-primary/[0.02] py-6">
        <Marquee duration={44}>
          {services.map((service) => (
            <span
              key={service.slug}
              className="mx-6 inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-primary/50"
            >
              <Icon name={service.icon} className="h-4 w-4 text-accent" />
              {service.name}
            </span>
          ))}
        </Marquee>
      </section>

      {/* ===== Scrollytelling épinglé ===== */}
      <ScrollStory steps={steps}>
        <ModuleMosaic />
        <div className="w-full max-w-[340px] sm:max-w-xl">
          <DashboardPreview />
        </div>
        <PhonePreview />
        <div className="relative w-full max-w-[240px] sm:max-w-sm">
          <div className="overflow-hidden rounded-3xl shadow-[0_32px_80px_-32px_rgb(0_0_0/0.6)]">
            <Image
              src="/images/cliente.jpg"
              alt="Passagère utilisant l'application Sira"
              width={1920}
              height={2400}
              className="h-auto w-full object-cover"
            />
          </div>
          <div className="absolute -left-6 bottom-6 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-lg">
            <Icon name="heart" className="h-3.5 w-3.5 text-accent-dark" />
            Programme de fidélité
          </div>
        </div>
      </ScrollStory>

      {/* ===== Répertoire des modules ===== */}
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        {groups.map((group) => (
          <section
            key={group.id}
            id={group.id}
            className="border-t border-primary/10 py-14 first:border-t-0 first:pt-0"
          >
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                {group.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl">
                {group.title}
              </h2>
            </Reveal>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.slugs.map((slug, groupIndex) => {
                const service = serviceBySlug.get(slug)!;
                return (
                  <Reveal key={slug} delay={(groupIndex % 3) * 0.07}>
                    <article
                      id={slug}
                      className="group flex h-full items-center gap-4 rounded-2xl border border-primary/10 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 transition duration-300 group-hover:scale-105 group-hover:bg-accent/15">
                        <Icon
                          name={service.icon}
                          className="h-6 w-6 text-accent-dark"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary">
                          {service.name}
                        </h3>
                        <p className="mt-0.5 text-sm text-primary/55">
                          {service.summary}
                        </p>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* ===== CTA ===== */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <CTABand
          title="Un module en particulier vous intéresse ?"
          description="Demandez une démonstration pour le voir appliqué à votre compagnie."
        />
      </div>
    </main>
  );
}
