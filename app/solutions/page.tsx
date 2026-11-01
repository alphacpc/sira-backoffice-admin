import Link from "next/link";
import { profiles, type SolutionProfile } from "@/content/solutions";
import { services } from "@/content/services";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/motion";
import CTABand from "@/components/CTABand";
import PhoneFrame from "@/components/PhoneFrame";
import DashboardPreview from "@/components/previews/DashboardPreview";

const serviceNameBySlug = new Map(services.map((s) => [s.slug, s.name]));

type RoleVisual =
  | { kind: "dashboard" }
  | { kind: "phone"; src: string; alt: string; badge: string };

const roleVisuals: Record<string, RoleVisual> = {
  compagnie: { kind: "dashboard" },
  guichet: {
    kind: "phone",
    src: "/images/sieges.png",
    alt: "Choix du siège via le plan du bus au guichet",
    badge: "Plan du bus",
  },
  terrain: {
    kind: "phone",
    src: "/images/scan-ticket.png",
    alt: "Contrôle d'un billet par scan sur le terrain",
    badge: "Contrôle en un scan",
  },
  passager: {
    kind: "phone",
    src: "/images/billet.png",
    alt: "Billet électronique du passager",
    badge: "Billet en poche",
  },
};

/** Visuel associé à chaque rôle. */
function RoleVisual({ slug }: { slug: string }) {
  const visual = roleVisuals[slug] ?? roleVisuals.compagnie;

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_center,rgb(245_165_36/0.12),transparent_70%)]"
      />
      <div className="relative">
        {visual.kind === "dashboard" ? (
          <>
            <DashboardPreview />
            <p className="mt-4 text-center text-sm text-primary/50">
              Le tableau de bord de la plateforme Sira
            </p>
          </>
        ) : (
          <PhoneFrame
            src={visual.src}
            alt={visual.alt}
            badge={visual.badge}
            className="mx-auto max-w-[240px]"
          />
        )}
      </div>
    </div>
  );
}

export default function SolutionsPage() {
  return (
    <main className="bg-white">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgb(245_165_36/0.12),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pt-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Solutions
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              Une plateforme,{" "}
              <span className="text-gradient">quatre métiers.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-primary/60">
              Sira s&apos;adapte à chaque rôle de la compagnie de transport — de
              la direction au guichet, du terrain au passager — sur un même
              socle technique.
            </p>
          </Reveal>

          {/* Navigation par rôle */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {profiles.map((profile, index) => (
              <Reveal key={profile.slug} delay={index * 0.07}>
                <a
                  href={`#${profile.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-5 transition hover:-translate-y-1 hover:border-accent/50 hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                      <Icon
                        name={profile.icon}
                        className="h-5 w-5 text-accent-dark"
                      />
                    </div>
                    <span className="text-xs font-bold text-primary/20">
                      0{index + 1}
                    </span>
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-primary">
                    {profile.name}
                  </h2>
                  <p className="mt-1 text-xs text-primary/50">
                    {profile.audience}
                  </p>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Détail de chaque rôle ===== */}
      {profiles.map((profile, index) => {
        const flip = index % 2 === 1;
        return (
          <section
            key={profile.slug}
            id={profile.slug}
            className={index % 2 === 1 ? "bg-primary/[0.02]" : "bg-white"}
          >
            <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
              <Reveal>
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                  <div className={flip ? "lg:order-2" : ""}>
                    <RoleVisual slug={profile.slug} />
                  </div>

                  <div className={flip ? "lg:order-1" : ""}>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                        <Icon
                          name={profile.icon}
                          className="h-6 w-6 text-accent-dark"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                          Rôle 0{index + 1}
                        </p>
                        <h2 className="text-2xl font-bold text-primary-deep sm:text-3xl">
                          {profile.name}
                        </h2>
                      </div>
                    </div>

                    <span className="mt-4 inline-block rounded-full border border-primary/15 px-3 py-1 text-xs font-medium text-primary/60">
                      {profile.audience}
                    </span>
                    <p className="mt-4 text-lg text-primary/70">
                      {profile.summary}
                    </p>

                    <ul className="mt-6 space-y-3">
                      {profile.benefits.map((benefit) => (
                        <li
                          key={benefit}
                          className="flex items-start gap-2.5 text-primary/80"
                        >
                          <Icon
                            name="check"
                            className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark"
                          />
                          {benefit}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary/40">
                        Modules associés
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.serviceSlugs.map((slug) => {
                          const name = serviceNameBySlug.get(slug);
                          if (!name) return null;
                          return (
                            <Link
                              key={slug}
                              href={`/services#${slug}`}
                              className="rounded-full border border-primary/20 px-3 py-1 text-xs font-medium text-primary/70 transition hover:border-primary/40 hover:text-primary"
                            >
                              {name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        );
      })}

      {/* ===== CTA ===== */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <CTABand
          title="Un rôle en particulier vous intéresse ?"
          description="Demandez une démonstration et découvrez Sira du point de vue de votre métier."
        />
      </div>
    </main>
  );
}
