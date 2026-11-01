import type { Metadata } from "next";
import { Container, Eyebrow, ButtonLink } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/icons";
import ChapterMock from "@/components/mockups/ChapterMock";
import FaqAccordion from "@/components/FaqAccordion";
import { chapters } from "@/content/solution";
import { faqItems } from "@/content/faq";

export const metadata: Metadata = {
  title: "La solution",
  description:
    "Flotte, billetterie, colis, équipes, clients et conformité : ce que Sira fait pour une compagnie de transport interurbain.",
};

export default function SolutionPage() {
  return (
    <main>
      <section className="pb-6 pt-16 lg:pt-24">
        <Container>
          <Reveal>
            <Eyebrow>La solution</Eyebrow>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Cinq chapitres pour piloter une compagnie de transport.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink/75">
              Chaque chapitre est utilisable seul et s&apos;appuie sur les mêmes données : un bus
              créé dans la flotte se retrouve dans la billetterie, un employé dans les accès.
            </p>
            <nav aria-label="Chapitres" className="mt-8 flex flex-wrap gap-2">
              {chapters.map((c) => (
                <a
                  key={c.id}
                  href={`#${c.id}`}
                  className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium transition hover:border-forest hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                >
                  {c.title}
                </a>
              ))}
            </nav>
          </Reveal>
        </Container>
      </section>

      {chapters.map((c, i) => (
        <section
          key={c.id}
          id={c.id}
          className={`py-16 ${i % 2 === 0 ? "" : "bg-sand/60"}`}
        >
          <Container
            className={`grid grid-cols-1 items-start gap-12 lg:grid-cols-2 [&>*]:min-w-0 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}
          >
            <Reveal>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest/10 text-forest">
                <Icon name={c.icon} className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-3xl font-semibold">{c.title}</h2>
              <p className="mt-2 text-xl text-ink/80">{c.tagline}</p>
              <p className="mt-4 text-ink/75">{c.description}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink/85">
                {c.points.map((p) => (
                  <li key={p} className="flex gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                    {p}
                  </li>
                ))}
              </ul>
              {c.pending.length > 0 && (
                <div className="mt-6 rounded-xl border border-dashed border-ink/25 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-ink">
                    À venir
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-ink/70">
                    {c.pending.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Reveal>
            <Reveal delay={0.08}>
              <div className="lg:sticky lg:top-28">
                <ChapterMock id={c.id} />
              </div>
            </Reveal>
          </Container>
        </section>
      ))}

      <section id="faq" className="py-20">
        <Container className="max-w-3xl">
          <Reveal>
            <Eyebrow>Questions fréquentes</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold">Ce que l&apos;on nous demande souvent.</h2>
          </Reveal>
          <div className="mt-8">
            <FaqAccordion items={faqItems} />
          </div>
          <div className="mt-10">
            <ButtonLink href="/demo">Demander une démo</ButtonLink>
          </div>
        </Container>
      </section>
    </main>
  );
}
