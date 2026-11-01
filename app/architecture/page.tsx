import {
  technicalServices,
  platformComponents,
  stack,
  principles,
} from "@/content/architecture";
import CTABand from "@/components/CTABand";
import { Reveal } from "@/components/motion";

export default function ArchitecturePage() {
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
              Architecture
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              Microservices dès le <span className="text-gradient">premier jour.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-primary/60">
              Sira est construite en microservices, chacun responsable d&apos;un
              domaine métier précis, avec sa propre base de données et son
              propre cycle de vie.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Les services ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl">
            Les services
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {technicalServices.map((service, index) => (
            <Reveal key={service.name} delay={(index % 2) * 0.05} className="h-full">
              <div className="group flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-soft)]">
                <p className="font-mono text-sm font-semibold text-accent">
                  {service.name}
                </p>
                <p className="mt-2 text-sm text-primary/60">
                  {service.responsibility}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Composants transverses ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl">
            Composants transverses
          </h2>
          <p className="mt-2 max-w-2xl text-primary/60">
            Le socle qui relie les services entre eux, sans être lui-même un
            domaine métier.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platformComponents.map((component, index) => (
            <Reveal key={component.name} delay={(index % 3) * 0.05} className="h-full">
              <div className="group flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-soft)]">
                <p className="font-mono text-sm font-semibold text-primary">
                  {component.name}
                </p>
                <p className="mt-2 text-sm text-primary/60">{component.role}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Stack technique ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl">
            Stack technique
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stack.map((entry, index) => (
            <Reveal key={entry.category} delay={(index % 3) * 0.05} className="h-full">
              <div className="h-full rounded-2xl border border-primary/10 bg-white p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-primary/50">
                  {entry.category}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-primary/[0.04] px-3 py-1 text-xs font-medium text-primary/80 ring-1 ring-primary/10"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Principes ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl">
            Principes
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {principles.map((principle, index) => (
            <Reveal key={principle.title} delay={(index % 3) * 0.05} className="h-full">
              <div className="flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-soft)]">
                <span className="text-xs font-bold text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-primary">
                  {principle.title}
                </h3>
                <p className="mt-2 text-sm text-primary/60">
                  {principle.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <CTABand
          title="Envie de voir cette architecture à l'œuvre ?"
          description="Une démonstration vous montre la plateforme de bout en bout."
        />
      </div>
    </main>
  );
}
