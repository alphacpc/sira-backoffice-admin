import type { Metadata } from "next";
import Image from "next/image";
import { Container, Eyebrow, ButtonLink, Title2 } from "@/components/ui";
import { Enter, HeroBlock, Reveal } from "@/components/motion";
import { RouteThread } from "@/components/route/RouteThread";
import { Stop } from "@/components/route/Stop";
import { ChapterFull } from "@/components/route/ChapterFull";
import { FleetMapCard } from "@/components/screens/FleetMapCard";
import { LocationComposition } from "@/components/screens/LocationComposition";
import { ParcelScreen } from "@/components/screens/ParcelScreen";
import { StaffScreen } from "@/components/screens/StaffScreen";
import { SupervisionScreen } from "@/components/screens/SupervisionScreen";
import FaqAccordion from "@/components/FaqAccordion";
import { chapters, type Chapter } from "@/content/solution";
import { faqItems } from "@/content/faq";

export const metadata: Metadata = {
  title: "La solution",
  description:
    "Flotte, billetterie, location de bus, colis, équipes, clients et conformité : ce que Sira fait pour une compagnie de transport interurbain.",
};

const fade = {
  WebkitMaskImage: "linear-gradient(to bottom, #000 58%, transparent 96%)",
  maskImage: "linear-gradient(to bottom, #000 58%, transparent 96%)",
} as const;

function Visual({ id }: { id: Chapter["id"] }) {
  switch (id) {
    case "flotte":
      return (
        <div className="rounded-[2rem] bg-mist p-3 sm:p-6">
          <FleetMapCard />
        </div>
      );
    case "billetterie":
      return (
        <div className="relative mx-auto flex w-full max-w-[520px] items-end justify-center gap-4 rounded-[2rem] bg-amber-soft px-6 pb-0 pt-8 sm:gap-6 sm:px-10">
          <Image
            src="/images/sieges.png"
            alt="Plan des sièges du bus, deux places choisies."
            width={820}
            height={1576}
            sizes="(min-width: 1024px) 18vw, 42vw"
            className="mb-8 h-auto w-[48%] rounded-[1.5rem] shadow-lift"
          />
          <div className="w-[44%]" style={fade}>
            <Image
              src="/images/clean/billet.png"
              alt="Billet électronique avec code QR."
              width={820}
              height={1323}
              sizes="(min-width: 1024px) 18vw, 40vw"
              className="block h-auto w-full rounded-[1.5rem] shadow-lift"
            />
          </div>
        </div>
      );
    case "location":
      return <LocationComposition variant="stack" />;
    case "colis":
      return (
        <div className="rounded-[2rem] bg-navy px-3 py-8 sm:px-8">
          <ParcelScreen />
        </div>
      );
    case "equipes":
      return (
        <div className="rounded-[2rem] bg-mist px-3 py-8 [&_figcaption]:font-semibold [&_figcaption]:text-navy sm:px-8">
          <StaffScreen />
        </div>
      );
    case "pilotage":
      return (
        <div className="rounded-[2rem] bg-navy px-3 py-8 sm:px-8">
          <SupervisionScreen />
        </div>
      );
  }
}

export default function SolutionPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-paper pb-6 pt-14 lg:pt-20">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-52 h-[520px] w-[520px] text-amber"
          viewBox="0 0 620 620"
          fill="none"
        >
          {[310, 230, 150].map((r) => (
            <circle key={r} cx="310" cy="310" r={r} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
          ))}
        </svg>
        <Container className="relative">
          <div>
<HeroBlock>
            <Eyebrow>La solution</Eyebrow>
            <Title2
              as="h1"
              lead="Six chapitres pour piloter"
              accent="une compagnie de transport."
              className="mt-5 max-w-3xl text-4xl sm:text-5xl lg:text-[3.4rem]"
            />
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/75">
              Chaque chapitre est utilisable seul et s&apos;appuie sur les mêmes données : un bus
              créé dans la flotte se retrouve dans la billetterie, un employé dans les accès.
            </p>
            <nav aria-label="Chapitres" className="mt-8 flex flex-wrap gap-2.5">
              {chapters.map((c) => (
                <a
                  key={c.id}
                  href={`#${c.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-white px-4 py-2 text-sm font-semibold text-navy transition duration-200 hover:-translate-y-0.5 hover:border-navy hover:shadow-soft motion-reduce:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  <span className="font-mono text-[11px] tracking-[0.12em] text-amber-ink">{c.stop.code}</span>
                  {c.title}
                </a>
              ))}
            </nav>
          </HeroBlock>
</div>
        </Container>
      </section>

      <section className="bg-paper pb-10">
        <Container>
          <RouteThread background="#fafafa">
            {chapters.map((c, i) => (
              <Stop key={c.id} id={c.id} code={c.stop.code} name={c.stop.name} align={i % 2 ? "right" : "left"}>
                <Enter x={i % 2 ? 28 : -28} duration={0.7}>
                  <ChapterFull c={c} />
                </Enter>
                <Enter x={i % 2 ? -44 : 44} scale={0.96} duration={0.8} delay={0.12}>
                  <Visual id={c.id} />
                </Enter>
              </Stop>
            ))}
            <div className="h-6" />
          </RouteThread>
        </Container>
      </section>

      <section id="faq" className="bg-mist py-20 lg:py-24">
        <Container className="max-w-3xl">
          <Reveal>
            <Eyebrow>Questions fréquentes</Eyebrow>
            <Title2
              lead="Ce que l'on nous"
              accent="demande souvent."
              className="mt-4 text-3xl sm:text-4xl"
            />
          </Reveal>
          <div className="mt-8">
            <FaqAccordion items={faqItems} />
          </div>
          <div className="mt-10">
            <ButtonLink href="/demo" variant="accent">
              Demander une démo
            </ButtonLink>
          </div>
        </Container>
      </section>
    </main>
  );
}
