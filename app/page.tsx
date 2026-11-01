import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container, Eyebrow, ButtonLink, Title2 } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { RouteThread } from "@/components/route/RouteThread";
import { Stop } from "@/components/route/Stop";
import { Coupon } from "@/components/Coupon";
import { PhotoCard } from "@/components/PhotoCard";
import ParcoursVoyageur from "@/components/ParcoursVoyageur";
import { FleetMapCard } from "@/components/screens/FleetMapCard";
import { ParcelScreen } from "@/components/screens/ParcelScreen";
import { StaffScreen } from "@/components/screens/StaffScreen";
import { SupervisionScreen } from "@/components/screens/SupervisionScreen";
import { chapters, type Chapter } from "@/content/solution";
import { trustPoints, planPreview } from "@/content/home";

export const metadata: Metadata = {
  title: { absolute: "Sira — Toute votre compagnie de transport dans une seule plateforme" },
};

const chapter = (id: Chapter["id"]) => chapters.find((c) => c.id === id)!;

const fade = {
  WebkitMaskImage: "linear-gradient(to bottom, #000 58%, transparent 96%)",
  maskImage: "linear-gradient(to bottom, #000 58%, transparent 96%)",
} as const;

/** Text side of a stop: title, description, at most three points, link. */
function StopText({ c, dark = false }: { c: Chapter; dark?: boolean }) {
  return (
    <div>
      <h3
        className={`text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl lg:text-[2.6rem] ${
          dark ? "text-white" : "text-navy"
        }`}
      >
        {c.tagline}
      </h3>
      <p className={`mt-5 max-w-lg text-base leading-relaxed ${dark ? "text-white/80" : "text-ink/75"}`}>
        {c.description}
      </p>
      <ul className="mt-6 max-w-lg space-y-3">
        {c.points.slice(0, 3).map((p) => (
          <li
            key={p}
            className={`flex gap-3 border-t pt-3 text-sm leading-relaxed ${
              dark ? "border-white/15 text-white/85" : "border-navy/10 text-ink/80"
            }`}
          >
            <span aria-hidden="true" className="mt-[7px] h-1.5 w-4 shrink-0 rounded-full bg-amber" />
            {p}
          </li>
        ))}
      </ul>
      <Link
        href={`/solution#${c.id}`}
        className={`mt-7 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.16em] focus-visible:outline-2 focus-visible:outline-offset-4 ${
          dark ? "text-amber focus-visible:outline-amber" : "text-navy focus-visible:outline-navy"
        }`}
      >
        <span className="border-b-2 border-amber pb-0.5">Voir le détail</span>
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

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
  const colis = chapter("colis");
  const equipes = chapter("equipes");
  const pilotage = chapter("pilotage");

  return (
    <main>
      {/* 1. Hero */}
      <section className="relative overflow-hidden bg-paper">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 h-[760px] w-[760px] text-amber"
          viewBox="0 0 760 760"
          fill="none"
        >
          {[380, 300, 220, 140].map((r) => (
            <circle key={r} cx="380" cy="380" r={r} stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
          ))}
        </svg>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-52 -left-52 h-[520px] w-[520px] text-amber"
          viewBox="0 0 520 520"
          fill="none"
        >
          {[260, 190, 120].map((r) => (
            <circle key={r} cx="260" cy="260" r={r} stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
          ))}
        </svg>

        <Container className="relative grid grid-cols-1 items-center gap-16 pb-16 pt-12 [&>*]:min-w-0 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pb-24 lg:pt-20">
          <Reveal>
            <Eyebrow>Pour les compagnies d&apos;autocars d&apos;Afrique de l&apos;Ouest</Eyebrow>
            <Title2
              as="h1"
              lead="Toute votre compagnie de transport, dans"
              accent="une seule plateforme."
              className="mt-6 text-[2.5rem] sm:text-6xl lg:text-[3.9rem] xl:text-[4.5rem]"
            />
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink/75">
              Flotte, billetterie, colis, équipes et conformité. Sira remplace les cahiers de guichet
              et les tableurs par un outil unique, pensé pour votre exploitation.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/demo" variant="accent">
                Demander une démo
              </ButtonLink>
              <ButtonLink href="/solution" variant="outline">
                Voir la solution
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mx-auto aspect-[1/1.02] w-full max-w-[560px] lg:max-w-none">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-[6%] top-[14%] rounded-[2.25rem] bg-navy lg:left-[6%]"
              />
              <div
                aria-hidden="true"
                className="absolute right-[10%] top-[8%] h-3 w-24 rounded-full bg-amber lg:right-[14%]"
              />
              <PhotoCard
                src="/images/clean/gestionnaire-ecran.png"
                alt="Un gestionnaire de compagnie découvre, surpris, ce que son écran lui affiche."
                width={1920}
                height={1356}
                rotate="right"
                priority
                sizes="(min-width: 1024px) 34vw, 70vw"
                className="absolute right-[3%] top-0 w-[68%]"
              />
              <PhotoCard
                src="/images/clean/gestionnaire-laptop.png"
                alt="Une responsable d'exploitation consulte Sira sur son ordinateur portable."
                width={1920}
                height={1959}
                rotate="left"
                sizes="(min-width: 1024px) 22vw, 42vw"
                className="absolute bottom-[0%] left-[0%] w-[42%]"
              />
              <div
                className="absolute -bottom-[7%] right-[4%] w-[33%] drop-shadow-[0_24px_30px_rgba(13,18,38,0.45)]"
                style={fade}
              >
                <Image
                  src="/images/clean/billet.png"
                  alt="Billet électronique Sira : Dakar, Touba, siège 12A, code QR."
                  width={820}
                  height={1323}
                  sizes="(min-width: 1024px) 18vw, 34vw"
                  className="block h-auto w-full rounded-[1.5rem]"
                />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 2. Cinq arrêts sur la route */}
      <section className="bg-paper pb-10 pt-4 lg:pt-10">
        <Container>
          <Reveal>
            <p className="max-w-2xl text-balance text-2xl font-extrabold leading-tight tracking-tight text-navy sm:text-3xl">
              <span className="text-[#c27800]">Cinq arrêts</span> sur la route de votre exploitation.
            </p>
          </Reveal>
          <RouteThread background="#fafafa" className="mt-10">
            <Terminus code="DKR" label="Départ" />

            <Stop id="flotte" code={flotte.stop.code} name={flotte.stop.name}>
              <StopText c={flotte} />
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 translate-x-1 translate-y-4 rounded-[2rem] bg-navy lg:-inset-4 lg:translate-x-5 lg:translate-y-6"
                />
                <FleetMapCard className="relative" />
              </div>
            </Stop>

            <Stop id="billetterie" code={billetterie.stop.code} name={billetterie.stop.name} align="right">
              <div className="relative mx-auto w-full max-w-[580px] pb-12 pt-4 lg:pb-16">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 top-[20%] rounded-[2rem] bg-navy"
                />
                <PhotoCard
                  src="/images/clean/voyageuse.jpg"
                  alt="Une voyageuse serre contre elle l'arbre de son village, un billet confirmé Dakar-Touba affiché à l'écran."
                  width={1920}
                  height={1368}
                  rotate="left"
                  sizes="(min-width: 1024px) 34vw, 90vw"
                  className="relative w-[82%]"
                />
                <div className="relative -mt-24 flex items-end justify-end gap-3 pr-3 sm:-mt-36">
                  <Image
                    src="/images/sieges.png"
                    alt="Plan des sièges du bus, deux places choisies."
                    width={820}
                    height={1576}
                    sizes="(min-width: 1024px) 14vw, 38vw"
                    className="h-auto w-[40%] -rotate-3 rounded-[1.5rem] drop-shadow-[0_20px_28px_rgba(13,18,38,0.5)]"
                  />
                  <div className="w-[38%] translate-y-4 rotate-2 drop-shadow-[0_20px_28px_rgba(13,18,38,0.5)]" style={fade}>
                    <Image
                      src="/images/clean/billet.png"
                      alt="Billet électronique avec code QR."
                      width={820}
                      height={1323}
                      sizes="(min-width: 1024px) 14vw, 38vw"
                      className="block h-auto w-full rounded-[1.5rem]"
                    />
                  </div>
                </div>
              </div>
              <StopText c={billetterie} />
            </Stop>

            <Stop id="colis" code={colis.stop.code} name={colis.stop.name}>
              <div className="lg:col-span-2">
                <div className="relative overflow-hidden rounded-[2rem] bg-amber-soft px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
                  <div className="relative grid grid-cols-1 items-center gap-10 [&>*]:min-w-0 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
                    <StopText c={colis} />
                    <ParcelScreen />
                  </div>
                </div>
              </div>
            </Stop>

            <Stop id="equipes" code={equipes.stop.code} name={equipes.stop.name} align="right">
              <div className="relative mx-auto w-full max-w-[460px]">
                <div
                  aria-hidden="true"
                  className="absolute -bottom-5 -left-5 right-10 top-12 rounded-[2rem] bg-amber"
                />
                <div className="relative [&_figcaption]:font-semibold [&_figcaption]:text-navy">
                  <StaffScreen />
                </div>
              </div>
              <StopText c={equipes} />
            </Stop>

            <Stop id="pilotage" code={pilotage.stop.code} name={pilotage.stop.name}>
              <div className="lg:col-span-2">
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
              </div>
            </Stop>

            <Terminus code="TBA" label="Arrivée" arrival />
          </RouteThread>
        </Container>
      </section>

      {/* 3. Bandeau photo */}
      <section className="relative mt-16 bg-paper pb-0 lg:mt-24">
        <div className="relative overflow-hidden bg-navy-deep">
          <Image
            src="/images/bus-sunset.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[50%_72%]"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-navy/70" />
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-navy-deep to-transparent" />
          <Container className="relative pb-44 pt-20 lg:pb-52 lg:pt-28">
            <Reveal>
              <Eyebrow tone="dark">Confiance</Eyebrow>
              <Title2
                tone="dark"
                lead="Voyagez"
                accent="ensemble."
                className="mt-5 text-5xl sm:text-6xl lg:text-8xl"
              />
            </Reveal>
          </Container>
        </div>
        <Container className="relative -mt-32 pb-20 lg:-mt-36">
          <ul className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
            {trustPoints.map((t, i) => (
              <li key={t.title}>
                <Reveal delay={i * 0.07} className="h-full">
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
                <Reveal delay={i * 0.07} className="h-full">
                  <Coupon
                    notch="#fafafa"
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

      {/* 6. Bandeau final */}
      <section className="bg-paper pb-20 lg:pb-28">
        <Container>
          <Reveal>
            <Coupon
              tone="navy"
              notch="#fafafa"
              stub={
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    aria-hidden="true"
                    className="flex items-center gap-3 font-mono text-sm font-bold tracking-[0.12em] text-white"
                  >
                    DKR
                    <span className="h-0 flex-1 border-t-2 border-dashed border-amber sm:w-40 sm:flex-none" />
                    <span className="text-amber">TBA</span>
                  </p>
                  <ButtonLink href="/demo" variant="accent">
                    Demander une démo
                  </ButtonLink>
                </div>
              }
            >
              <div className="px-2 py-6 lg:px-8 lg:py-10">
                <Eyebrow tone="dark">Prochaine étape</Eyebrow>
                <Title2
                  tone="dark"
                  as="h2"
                  lead="Voyez Sira"
                  accent="sur l'exploitation d'une compagnie."
                  className="mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl"
                />
              </div>
            </Coupon>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
