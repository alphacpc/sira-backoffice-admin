import type { Metadata } from "next";
import Image from "next/image";
import { Container, Eyebrow, ButtonLink, Title2 } from "@/components/ui";
import { HeroBlock, Reveal } from "@/components/motion";
import { Icon } from "@/components/icons";
import { trustSections } from "@/content/trust";
import { underTheHood } from "@/content/under-the-hood";

export const metadata: Metadata = {
  title: "Sécurité et confiance",
  description:
    "Isolation entre compagnies, rôles, journal d'audit, RGPD et exploitation : comment Sira protège vos données.",
};

/** Mono two-column ledger line: name in amber, role in soft white. */
function LedgerList({ items }: { items: { name: string; role: string }[] }) {
  return (
    <ul className="mt-5 grid grid-cols-1 overflow-hidden rounded-2xl border border-white/15 bg-navy-deep/60 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
      {items.map((s) => (
        <li key={s.name} className="border-b border-dashed border-white/15 p-5">
          <p className="font-mono text-sm font-semibold text-amber">{s.name}</p>
          <p className="mt-1.5 text-sm text-white/75">{s.role}</p>
        </li>
      ))}
    </ul>
  );
}

export default function SecurityPage() {
  return (
    <main className="bg-paper">
      {/* Hero: photo bottom-anchored and zoomed so the burned-in logo (top of the file) stays out of frame. */}
      <section className="relative overflow-hidden bg-navy-deep">
        <Image
          src="/images/bus-sunset.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="origin-bottom scale-[1.5] object-cover object-bottom lg:scale-[1.08]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-navy-deep/85 via-navy/50 to-navy/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-navy-deep/70 to-transparent"
        />
        <Container className="relative pb-20 pt-16 lg:pb-28 lg:pt-24">
          <div>
<HeroBlock>
            <Eyebrow tone="dark">Sécurité et confiance</Eyebrow>
            <Title2
              as="h1"
              tone="dark"
              lead="Des données de voyageurs et de paiements,"
              accent="traitées avec sérieux."
              className="mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl"
            />
            <p className="mt-6 max-w-2xl text-lg text-white/80">
              Voici ce que la plateforme met en œuvre, concrètement.
            </p>
            <div className="mt-8">
              <ButtonLink href="#sous-le-capot" variant="outline-light">
                Sous le capot
              </ButtonLink>
            </div>
          </HeroBlock>
</div>
        </Container>
      </section>

      <section className="py-16 lg:py-24">
        <Container className="space-y-6">
          {trustSections.map((s, i) => (
            <Reveal key={s.title} delay={Math.min(i, 2) * 0.05}>
              <article className="grid grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-navy/10 lg:grid-cols-[0.8fr_1.2fr] [&>*]:min-w-0">
                <div className="p-7 lg:p-9">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold tracking-[0.18em] text-amber-ink">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-navy/25" />
                    <Icon name={s.icon} className="h-5 w-5 text-navy" />
                  </div>
                  <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-navy">{s.title}</h2>
                  <p className="mt-2 text-ink/70">{s.description}</p>
                </div>
                <ul className="border-t-2 border-dashed border-navy/15 p-7 lg:border-l-2 lg:border-t-0 lg:p-9">
                  {s.points.map((p, j) => (
                    <li
                      key={p}
                      className="grid grid-cols-[2.25rem_1fr] gap-2 border-b border-dashed border-navy/15 py-3 text-sm text-ink/85 first:pt-0 last:border-b-0 last:pb-0"
                    >
                      <span className="font-mono text-xs font-semibold text-amber-ink">
                        {String(i + 1).padStart(2, "0")}.{j + 1}
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </Container>
      </section>

      <section id="sous-le-capot" className="bg-navy-dark py-20 text-white lg:py-28">
        <Container>
          <Reveal>
            <Eyebrow tone="dark">Sous le capot</Eyebrow>
            <Title2
              tone="dark"
              lead="Pour vos équipes techniques :"
              accent="comment c'est construit."
              className="mt-3 max-w-3xl text-3xl sm:text-4xl"
            />
          </Reveal>

          <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 [&>*]:min-w-0">
            {underTheHood.principles.map((p, i) => (
              <li key={p.title} className="rounded-2xl border border-white/15 p-6">
                <p className="font-mono text-xs font-semibold tracking-[0.18em] text-amber">
                  P{i + 1}
                </p>
                <h3 className="mt-3 text-lg font-bold">{p.title}</h3>
                <p className="mt-2 text-sm text-white/75">{p.text}</p>
              </li>
            ))}
          </ul>

          <h3 className="mt-14 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-white">
            Dix services métier
          </h3>
          <LedgerList items={underTheHood.services} />
        </Container>
      </section>
    </main>
  );
}
