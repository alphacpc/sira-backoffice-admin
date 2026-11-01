import type { Metadata } from "next";
import Link from "next/link";
import { Container, Eyebrow, ButtonLink } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/icons";
import { BrowserFrame } from "@/components/mockups/Frame";
import DashboardMock from "@/components/mockups/DashboardMock";
import ChapterMock from "@/components/mockups/ChapterMock";
import Journey from "@/components/Journey";
import { chapters } from "@/content/solution";
import { trustPoints, planPreview } from "@/content/home";

export const metadata: Metadata = {
  title: { absolute: "Sira — Toute votre compagnie de transport dans une seule plateforme" },
};

const showcase = ["colis", "equipes", "flotte"] as const;

export default function HomePage() {
  return (
    <main>
      {/* 1. Hero */}
      <section className="relative overflow-hidden">
        <Container className="grid items-center gap-14 pb-20 pt-16 lg:grid-cols-[1fr_1.15fr] lg:pt-24">
          <Reveal>
            <Eyebrow>Pour les compagnies d&apos;autocars d&apos;Afrique de l&apos;Ouest</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              Toute votre compagnie de transport, dans{" "}
              <span className="mark">une seule plateforme.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink/75">
              Flotte, billetterie, colis, équipes et conformité. Sira remplace les cahiers de
              guichet et les tableurs par un outil unique, pensé pour votre exploitation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/demo">Demander une démo</ButtonLink>
              <ButtonLink href="/solution" variant="outline">
                Voir la solution
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <BrowserFrame url="app.sira.app/tableau-de-bord">
              <DashboardMock />
            </BrowserFrame>
          </Reveal>
        </Container>
      </section>

      {/* 2. Promesse */}
      <section className="bg-sand/60 py-20">
        <Container>
          <Reveal>
            <Eyebrow>Une plateforme, cinq chapitres</Eyebrow>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">
              Tout ce qu&apos;un exploitant gère chaque jour, au même endroit.
            </h2>
          </Reveal>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((c, i) => (
              <li key={c.id}>
                <Reveal delay={Math.min(i, 3) * 0.05} className="h-full">
                  <Link
                    href={`/solution#${c.id}`}
                    className="group flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-soft"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest/10 text-forest">
                      <Icon name={c.icon} className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-xl font-semibold">{c.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-ink/70">{c.tagline}</p>
                    <span className="mt-4 text-sm font-semibold text-forest group-hover:underline">
                      En savoir plus →
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 3. Parcours voyageur */}
      <section className="py-20">
        <Container>
          <Reveal>
            <Eyebrow>Le parcours du voyageur</Eyebrow>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">
              De la recherche au billet, en quatre étapes.
            </h2>
          </Reveal>
          <div className="mt-12">
            <Journey />
          </div>
        </Container>
      </section>

      {/* 4. Colis, équipes, flotte */}
      <section className="bg-sand/60 py-20">
        <Container className="space-y-24">
          {showcase.map((id, i) => {
            const c = chapters.find((x) => x.id === id)!;
            return (
              <div
                key={id}
                className={`grid grid-cols-1 items-center gap-12 lg:grid-cols-2 [&>*]:min-w-0${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <Reveal>
                  <Eyebrow>{c.title}</Eyebrow>
                  <h2 className="mt-3 text-3xl font-semibold">{c.tagline}</h2>
                  <p className="mt-4 text-ink/75">{c.description}</p>
                  <ul className="mt-5 space-y-2 text-sm text-ink/80">
                    {c.points.slice(0, 4).map((p) => (
                      <li key={p} className="flex gap-2.5">
                        <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/solution#${c.id}`} className="mt-6 inline-block text-sm font-semibold text-forest hover:underline">
                    Voir le détail →
                  </Link>
                </Reveal>
                <Reveal delay={0.08}>
                  <ChapterMock id={c.id} />
                </Reveal>
              </div>
            );
          })}
        </Container>
      </section>

      {/* 5. Confiance (seul panneau sombre) */}
      <section className="bg-forest-deep py-20 text-white">
        <Container>
          <Reveal>
            <Eyebrow tone="dark">Confiance</Eyebrow>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">
              Vos données et celles de vos voyageurs, protégées par conception.
            </h2>
          </Reveal>
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {trustPoints.map((t, i) => (
              <li key={t.title}>
                <Reveal delay={i * 0.06} className="h-full">
                  <div className="h-full rounded-2xl border border-white/15 bg-white/5 p-6">
                    <Icon name={t.icon} className="h-6 w-6 text-accent" />
                    <h3 className="mt-4 text-lg font-semibold">{t.title}</h3>
                    <p className="mt-2 text-sm text-white/75">{t.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <ButtonLink href="/securite" variant="outline-light">
              Découvrir notre approche de la sécurité
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* 6. Tarifs (aperçu) */}
      <section className="py-20">
        <Container>
          <Reveal>
            <Eyebrow>Tarifs</Eyebrow>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">
              Une offre composée selon votre compagnie.
            </h2>
            <p className="mt-4 max-w-2xl text-ink/75">
              Les plans, les limites et les fonctions activées sont configurés pour chaque
              compagnie. Les tarifs sont établis sur devis.
            </p>
          </Reveal>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {planPreview.map((p) => (
              <li key={p.name} className="rounded-2xl border border-ink/10 bg-white p-6">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <p className="mt-2 text-sm text-ink/70">{p.text}</p>
                <p className="mt-4 text-sm font-semibold text-forest">Sur devis</p>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <ButtonLink href="/tarifs" variant="outline">
              Comparer les niveaux
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* 7. Appel à la démo */}
      <section className="pb-24">
        <Container>
          <div className="rounded-3xl bg-forest px-8 py-14 text-center text-white sm:px-14">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Voyez Sira sur l&apos;exploitation d&apos;une compagnie.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              Une démonstration sur des données d&apos;exemple, adaptée à vos lignes et à vos équipes.
            </p>
            <div className="mt-8 flex justify-center">
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
