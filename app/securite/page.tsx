import type { Metadata } from "next";
import { Container, Eyebrow, ButtonLink } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/icons";
import { trustSections } from "@/content/trust";
import { underTheHood } from "@/content/under-the-hood";

export const metadata: Metadata = {
  title: "Sécurité et confiance",
  description:
    "Isolation entre compagnies, rôles, journal d'audit, RGPD et exploitation : comment Sira protège vos données.",
};

export default function SecurityPage() {
  return (
    <main>
      <section className="pb-6 pt-16 lg:pt-24">
        <Container>
          <Reveal>
            <Eyebrow>Sécurité et confiance</Eyebrow>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Des données de voyageurs et de paiements, traitées avec sérieux.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink/75">
              Voici ce que la plateforme fait aujourd&apos;hui, sans promesse sur ce qui n&apos;existe
              pas encore.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="py-12">
        <Container className="space-y-5">
          {trustSections.map((s, i) => (
            <Reveal key={s.title} delay={Math.min(i, 2) * 0.05}>
              <article className="grid grid-cols-1 [&>*]:min-w-0 gap-6 rounded-3xl border border-ink/10 bg-white p-7 sm:grid-cols-[auto_1fr] sm:p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest/10 text-forest">
                  <Icon name={s.icon} className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold">{s.title}</h2>
                  <p className="mt-2 text-ink/70">{s.description}</p>
                  <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                    {s.points.map((p) => (
                      <li key={p} className="flex gap-2.5 text-sm text-ink/85">
                        <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </Container>
      </section>

      <section id="sous-le-capot" className="bg-sand/60 py-20">
        <Container>
          <Reveal>
            <Eyebrow>Sous le capot</Eyebrow>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold">
              Pour vos équipes techniques : comment c&apos;est construit.
            </h2>
          </Reveal>

          <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 [&>*]:min-w-0">
            {underTheHood.principles.map((p) => (
              <li key={p.title} className="rounded-2xl border border-ink/10 bg-white p-6">
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-ink/70">{p.text}</p>
              </li>
            ))}
          </ul>

          <h3 className="mt-14 text-xl font-semibold">Dix services métier</h3>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {underTheHood.services.map((s) => (
              <li key={s.name} className="rounded-xl border border-ink/10 bg-white p-4 text-sm">
                <p className="font-semibold">{s.name}</p>
                <p className="mt-1 text-ink/70">{s.role}</p>
              </li>
            ))}
          </ul>

          <h3 className="mt-12 text-xl font-semibold">Composants communs</h3>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {underTheHood.components.map((c) => (
              <li key={c.name} className="rounded-xl border border-ink/10 bg-white p-4 text-sm">
                <p className="font-semibold">{c.name}</p>
                <p className="mt-1 text-ink/70">{c.role}</p>
              </li>
            ))}
          </ul>

          <p className="mt-10 text-sm text-ink/70">
            <span className="font-semibold text-ink">Technologies : </span>
            {underTheHood.stack.join(" · ")}.
          </p>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="rounded-3xl bg-forest px-8 py-12 text-center text-white">
            <h2 className="text-3xl font-semibold">Une question de sécurité ou de conformité ?</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">
              Parlons-en lors d&apos;une démonstration, avec vos responsables techniques si vous le souhaitez.
            </p>
            <div className="mt-6 flex justify-center">
              <ButtonLink href="/demo" variant="accent">
                Demander une démo
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
