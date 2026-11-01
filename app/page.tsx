import type { Metadata } from "next";
import Image from "next/image";
import { Container, Eyebrow, ButtonLink, Title2 } from "@/components/ui";
import { Reveal, Enter, ScrollZoom } from "@/components/motion";
import { RouteThread } from "@/components/route/RouteThread";
import { Stop } from "@/components/route/Stop";
import { StopText } from "@/components/route/StopText";
import { RouteLine } from "@/components/RouteLine";
import { Coupon } from "@/components/Coupon";
import { Hero } from "@/components/hero/Hero";
import { PhotoCard } from "@/components/PhotoCard";
import ParcoursVoyageur from "@/components/ParcoursVoyageur";
import { FleetMapCard } from "@/components/screens/FleetMapCard";
import { LocationComposition } from "@/components/screens/LocationComposition";
import { ParcelScreen } from "@/components/screens/ParcelScreen";
import { StaffScreen } from "@/components/screens/StaffScreen";
import { SupervisionScreen } from "@/components/screens/SupervisionScreen";
import { chapters, type Chapter } from "@/content/solution";
import { trustPoints, planPreview } from "@/content/home";

export const metadata: Metadata = {
  title: { absolute: "Sira — Toute votre compagnie de transport dans une seule plateforme" },
};

const chapter = (id: Chapter["id"]) => chapters.find((c) => c.id === id)!;

function Terminus({ code, label, arrival = false }: { code: string; label: string; arrival?: boolean }) {
  return (
    <div className={`relative ${arrival ? "pb-10 pt-2" : "py-2"}`}>
      {/* The arrival has no disc on desktop: the bus itself parks on the stop. */}
      <span
        aria-hidden="true"
        className={`absolute left-[-42px] h-7 w-7 rounded-full bg-amber lg:left-[-76px] lg:h-10 lg:w-10 ${
          arrival ? "bottom-[2.6rem] lg:hidden" : "top-1/2 -translate-y-1/2"
        }`}
        style={{ boxShadow: "0 0 0 4px #fafafa, 0 0 0 7px #1e2749" }}
      />
      <p className={`flex items-baseline gap-4 ${arrival ? "relative top-4" : ""}`}>
        <span className="font-mono text-2xl font-bold tracking-[0.1em] text-navy">{code}</span>
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amber-ink">{label}</span>
      </p>
    </div>
  );
}

export default function HomePage() {
  const flotte = chapter("flotte");
  const billetterie = chapter("billetterie");
  const location = chapter("location");
  const colis = chapter("colis");
  const equipes = chapter("equipes");
  const pilotage = chapter("pilotage");

  return (
    <main>
      {/* 1. Hero */}
      <Hero />

      {/* 2. Six arrêts sur la route */}
      <section className="bg-paper pb-10 pt-10 lg:pt-14">
        <Container>
          <Reveal>
            <p className="max-w-2xl text-balance text-2xl font-extrabold leading-tight tracking-tight text-navy sm:text-3xl">
              <span className="text-[#c27800]">Six arrêts</span> sur la route de votre exploitation.
            </p>
          </Reveal>
          <RouteThread background="#fafafa" className="mt-10">
            <Terminus code="DKR" label="Départ" />

            <Stop id="flotte" code={flotte.stop.code} name={flotte.stop.name}>
              <StopText c={flotte} />
              <Enter className="relative" x={44} scale={0.96} duration={0.8} delay={0.15}>
                <FleetMapCard className="relative" />
              </Enter>
            </Stop>

            <Stop id="billetterie" code={billetterie.stop.code} name={billetterie.stop.name} align="right">
              <Enter className="relative mx-auto w-full max-w-[600px]" x={-44} scale={0.96} duration={0.8} delay={0.15}>
                <PhotoCard
                  src="/images/clean/voyageuse.jpg"
                  alt="Une voyageuse serre contre elle l'arbre de son village, un billet confirmé Dakar-Touba affiché à l'écran."
                  width={1920}
                  height={1368}
                  rotate="left"
                  sizes="(min-width: 1024px) 34vw, 90vw"
                  className="w-full"
                />
              </Enter>
              <StopText c={billetterie} side="right" />
            </Stop>

            <Stop id="location" code={location.stop.code} name={location.stop.name}>
              <Enter className="lg:col-span-2" y={40} scale={0.97} duration={0.8}>
                <div className="relative rounded-[2rem] bg-mist px-4 py-10 sm:px-10 lg:px-8 lg:py-14">
                  <div className="relative grid grid-cols-1 items-center gap-10 [&>*]:min-w-0 lg:grid-cols-[0.82fr_1.18fr] lg:gap-8">
                    <StopText c={location} />
                    <LocationComposition variant="side" panel={false} quote={false} />
                  </div>
                </div>
              </Enter>
            </Stop>

            <Stop id="colis" code={colis.stop.code} name={colis.stop.name}>
              <Enter className="lg:col-span-2" y={40} scale={0.97} duration={0.8}>
                <div className="relative overflow-hidden rounded-[2rem] bg-amber-soft px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
                  <div className="relative grid grid-cols-1 items-center gap-10 [&>*]:min-w-0 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
                    <StopText c={colis} />
                    <ParcelScreen />
                  </div>
                </div>
              </Enter>
            </Stop>

            <Stop id="equipes" code={equipes.stop.code} name={equipes.stop.name} align="right">
              <Enter className="relative mx-auto w-full max-w-[540px]" x={-44} scale={0.96} duration={0.8} delay={0.15}>
                <div
                  aria-hidden="true"
                  className="absolute -bottom-5 -left-5 right-10 top-12 rounded-[2rem] bg-amber"
                />
                <div className="relative [&_figcaption]:font-semibold [&_figcaption]:text-navy">
                  <StaffScreen />
                </div>
              </Enter>
              <StopText c={equipes} side="right" />
            </Stop>

            <Stop id="pilotage" code={pilotage.stop.code} name={pilotage.stop.name}>
              <Enter className="lg:col-span-2" y={40} scale={0.97} duration={0.8}>
                <div className="relative overflow-hidden rounded-[2rem] bg-navy px-3 py-10 sm:px-10 lg:px-14 lg:py-14">
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] text-amber"
                    viewBox="0 0 520 520"
                    fill="none"
                  >
                    {[260, 190, 120].map((r) => (
                      <circle key={r} cx="260" cy="260" r={r} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
                    ))}
                  </svg>
                  <div className="relative grid grid-cols-1 items-center gap-10 [&>*]:min-w-0 lg:grid-cols-[1fr_0.9fr] lg:gap-14">
                    <div className="px-3 sm:px-0"><StopText c={pilotage} dark /></div>
                    <SupervisionScreen />
                  </div>
                </div>
              </Enter>
            </Stop>

            <Terminus code="TBA" label="Arrivée" arrival />
          </RouteThread>
        </Container>
      </section>

      {/* 3. Bandeau photo */}
      <section className="relative mt-16 bg-paper pb-0 lg:mt-24">
        <div className="relative overflow-hidden bg-navy-deep">
          <ScrollZoom>
            <Image
              src="/images/bus-sunset.png"
              alt=""
              fill
              sizes="100vw"
              className="origin-bottom scale-[1.5] object-cover object-bottom lg:origin-center lg:scale-100 lg:object-[50%_64%]"
            />
          </ScrollZoom>
          {/* Same treatment as the /securite hero: photo anchored at the bottom, burned-in logo out of frame. */}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-navy-deep/85 via-navy/45 to-navy/10" />
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-navy-deep/60 to-transparent" />
          <Container className="relative pb-44 pt-20 lg:pb-52 lg:pt-28">
            <Enter y={14}>
              <Eyebrow tone="dark">Confiance</Eyebrow>
            </Enter>
            <Title2
              tone="dark"
              lead="Voyagez"
              accent="ensemble."
              animate="view"
              delay={0.1}
              stagger={0.12}
              className="mt-5 text-5xl sm:text-6xl lg:text-8xl"
            />
          </Container>
        </div>
        <Container className="relative -mt-32 pb-20 lg:-mt-36">
          <ul className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
            {trustPoints.map((t, i) => (
              <li key={t.title}>
                <Reveal delay={i * 0.1} y={48} className="h-full">
                  <div
                    className={`h-full rounded-3xl bg-white p-7 shadow-lift ${
                      i === 1 ? "lg:-translate-y-6" : ""
                    }`}
                  >
                    <p className="font-mono text-xs font-bold tracking-[0.18em] text-amber-ink">
                      {String(i + 1).padStart(2, "0")} / 03
                    </p>
                    <h3 className="mt-4 text-xl font-extrabold leading-tight tracking-tight text-navy">
                      {t.title}
                    </h3>
                    <div aria-hidden="true" className="my-4 border-t-2 border-dashed border-navy/15" />
                    <p className="text-sm leading-relaxed text-ink/75">{t.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <ButtonLink href="/securite" variant="outline">
              Découvrir notre approche de la sécurité
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* 4. Parcours voyageur */}
      <section className="bg-navy py-20 text-white lg:py-28">
        <Container>
          <Reveal>
            <Eyebrow tone="dark">Le parcours du voyageur</Eyebrow>
            <Title2
              tone="dark"
              lead="De la recherche au billet,"
              accent="en quatre étapes."
              className="mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl"
            />
          </Reveal>
          <div className="mt-12 lg:mt-16">
            <ParcoursVoyageur />
          </div>
        </Container>
      </section>

      {/* 5. Niveaux d'offre */}
      <section className="bg-paper py-20 lg:py-28">
        <Container>
          <Reveal>
            <Eyebrow>Tarifs</Eyebrow>
            <Title2
              lead="Une offre composée"
              accent="selon votre compagnie."
              className="mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl"
            />
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink/75">
              Les plans, les limites et les fonctions activées sont configurés pour chaque compagnie.
              Les tarifs sont établis sur devis.
            </p>
          </Reveal>
          <ul className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {planPreview.map((p, i) => (
              <li key={p.name}>
                <Reveal delay={i * 0.09} className="h-full">
                  <Coupon
                    notch="#fafafa"
                    interactive
                    className="h-full"
                    stub={
                      <p className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.16em] text-navy">
                        <span>Sur devis</span>
                        <span aria-hidden="true" className="text-amber-ink">
                          {String(i + 1).padStart(2, "0")} / 03
                        </span>
                      </p>
                    }
                  >
                    <p className="font-mono text-xs font-bold tracking-[0.18em] text-amber-ink">
                      NIVEAU {i + 1}
                    </p>
                    <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-navy">{p.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink/75">{p.text}</p>
                  </Coupon>
                </Reveal>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <ButtonLink href="/tarifs" variant="outline">
              Comparer les niveaux
            </ButtonLink>
          </div>
        </Container>
      </section>

    </main>
  );
}
