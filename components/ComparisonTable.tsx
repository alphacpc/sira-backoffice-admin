"use client";

import { motion } from "motion/react";
import { Container, Eyebrow, Title2, ButtonLink } from "@/components/ui";
import { Reveal, EASE, useReduce } from "@/components/motion";
import { Icon } from "@/components/icons";
import { comparison, plans } from "@/content/plans";

const EMPH = "bg-amber-soft/40";

function Cell({ on, emph }: { on: boolean; emph: boolean }) {
  return (
    <td className={`px-3 py-3.5 text-center align-middle ${emph ? EMPH : ""}`}>
      {on ? (
        <>
          <Icon name="check" className="mx-auto h-5 w-5 text-navy" />
          <span className="sr-only">Inclus</span>
        </>
      ) : (
        <>
          <span aria-hidden="true" className="text-navy/50">—</span>
          <span className="sr-only">Non inclus</span>
        </>
      )}
    </td>
  );
}

export default function ComparisonTable() {
  const reduce = useReduce();
  const Body = reduce ? "tbody" : motion.tbody;
  const Row = reduce ? "tr" : motion.tr;
  const bodyMotion = reduce
    ? {}
    : {
        "data-motion": "",
        initial: "hidden",
        whileInView: "show",
        viewport: { once: true, margin: "-40px" },
        variants: { hidden: {}, show: { transition: { staggerChildren: 0.03 } } },
      };
  const rowMotion = reduce
    ? {}
    : {
        "data-motion": "",
        variants: {
          hidden: { opacity: 0, y: 8 },
          show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
        },
      };

  return (
    <section className="py-16 lg:py-24">
      <Container>
        <Reveal>
          <Eyebrow>Comparer les niveaux</Eyebrow>
          <Title2
            lead="Chaque niveau,"
            accent="fonction par fonction."
            className="mt-4 max-w-3xl text-3xl sm:text-4xl lg:text-5xl"
          />
        </Reveal>
        <p className="mt-6 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-navy/70 md:hidden">
          Faites défiler →
        </p>
        <div className="mt-3 overflow-x-auto [contain:paint] rounded-2xl border border-navy/15 bg-white shadow-soft md:mt-10">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <caption className="sr-only">
              Comparaison des fonctions incluses dans les niveaux Essentiel, Exploitation et Pilotage
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-[150px] bg-white md:w-[40%] px-4 py-4 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-navy/70"
                >
                  Fonction
                </th>
                {plans.map((p) => (
                  <th
                    key={p.name}
                    scope="col"
                    className={`px-3 py-4 text-center text-base font-extrabold text-navy ${
                      p.highlight ? `border-t-4 border-amber ${EMPH}` : "border-t-4 border-transparent"
                    }`}
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            {comparison.map((g) => (
              <Body key={g.code} {...bodyMotion}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={4}
                    className="border-y border-navy/10 bg-mist p-0 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-navy"
                  >
                    <span className="sticky left-0 block w-max px-4 py-2">
                      <span className="text-amber-ink">{g.code}</span> · {g.title}
                    </span>
                  </th>
                </tr>
                {g.rows.map((r) => (
                  <Row key={r.label} {...rowMotion} className="border-b border-dashed border-navy/15">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-white px-4 py-3.5 text-left font-medium text-ink/85"
                    >
                      {r.label}
                    </th>
                    {plans.map((p, i) => (
                      <Cell key={p.name} on={i >= r.from} emph={!!p.highlight} />
                    ))}
                  </Row>
                ))}
              </Body>
            ))}
            <tbody>
              <tr className="border-t-2 border-navy/20">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white px-4 py-4 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-navy"
                >
                  Tarif
                </th>
                {plans.map((p) => (
                  <td
                    key={p.name}
                    className={`px-3 py-4 text-center text-base font-extrabold text-navy ${p.highlight ? EMPH : ""}`}
                  >
                    Sur devis
                  </td>
                ))}
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky left-0 z-10 bg-white" />
                {plans.map((p) => (
                  <td key={p.name} className={`px-2 pb-5 pt-1 text-center [&_a]:px-3 [&_a]:py-2.5 [&_a]:text-xs md:[&_a]:px-6 md:[&_a]:py-3 md:[&_a]:text-sm ${p.highlight ? EMPH : ""}`}>
                    <ButtonLink href="/demo" variant={p.highlight ? "accent" : "outline"}>
                      Demander un devis
                    </ButtonLink>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </Container>
    </section>
  );
}
