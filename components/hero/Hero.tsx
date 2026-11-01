import Image from "next/image";
import { Container, Eyebrow, ButtonLink, Title2 } from "@/components/ui";
import { Enter, Drift } from "@/components/motion";
import { PhotoCard } from "@/components/PhotoCard";

const fadeBottom = {
  WebkitMaskImage: "linear-gradient(to bottom, #000 62%, transparent 97%)",
  maskImage: "linear-gradient(to bottom, #000 62%, transparent 97%)",
} as const;

function Rings() {
  return (
    <>
      <Drift distance={-70}>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-72 -top-48 h-[760px] w-[760px] text-amber lg:-right-24 lg:-top-24"
          viewBox="0 0 760 760"
          fill="none"
        >
          {[380, 300, 220, 140].map((r) => (
            <circle key={r} cx="380" cy="380" r={r} stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
          ))}
        </svg>
      </Drift>
      <Drift distance={-110}>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -left-56 h-[520px] w-[520px] text-amber"
          viewBox="0 0 520 520"
          fill="none"
        >
          {[260, 190, 120].map((r) => (
            <circle key={r} cx="260" cy="260" r={r} stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
          ))}
        </svg>
      </Drift>
    </>
  );
}

function Collage() {
  return (
    <div className="relative mx-auto mt-4 aspect-[1/0.95] w-full max-w-[600px] lg:absolute lg:inset-y-0 lg:right-0 lg:mx-0 lg:mt-0 lg:aspect-auto lg:w-[52%] lg:max-w-none">
      {/* Route DKR → TBA qui traverse le collage */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[26] h-full w-full"
        viewBox="0 0 690 540"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M 40 452 C 150 520, 230 300, 380 372 S 600 238, 700 96"
          stroke="#f5a524"
          strokeWidth="2.5"
          strokeDasharray="2 9"
          strokeLinecap="round"
        />
        <circle cx="40" cy="452" r="7" fill="#f5a524" />
        <circle cx="40" cy="452" r="13" stroke="#f5a524" strokeOpacity="0.4" />
      </svg>

      <Enter
        trigger="mount"
        aria-hidden="true"
        clip="left"
        fade={false}
        delay={0.1}
        duration={0.85}
        className="absolute -right-[10%] bottom-[2%] top-[14%] left-[16%] rounded-l-[2.25rem] bg-navy"
      />
      <PhotoCard
        src="/images/clean/gestionnaire-ecran.png"
        alt="Un gestionnaire de compagnie découvre, surpris, ce que son écran lui affiche."
        width={1920}
        height={1356}
        priority
        enter={{ delay: 0.15, x: 60, y: 20, rotate: 5 }}
        parallax="page"
        sizes="(min-width: 1024px) 36vw, 70vw"
        className="absolute -right-[4%] top-[3%] z-10 w-[68%] rotate-2 [&>div]:rounded-[1.75rem]"
      />
      <PhotoCard
        src="/images/clean/gestionnaire-laptop.png"
        alt="Une responsable d'exploitation consulte Sira sur son ordinateur portable."
        width={1920}
        height={1959}
        enter={{ delay: 0.3, x: -40, y: 50, rotate: -6 }}
        parallax="page"
        sizes="(min-width: 1024px) 22vw, 40vw"
        className="absolute bottom-[5%] left-[8%] z-20 w-[32%] -rotate-3 [&>div]:rounded-[1.5rem]"
      />
      <Enter
        trigger="mount"
        y={50}
        delay={0.5}
        duration={0.8}
        className="absolute bottom-[5%] left-[41%] z-[24] w-[27%] -rotate-2 drop-shadow-[0_22px_28px_rgba(13,18,38,0.4)]"
        style={fadeBottom}
      >
        {/* Écran des sièges, recadré sur le plan comme à l'arrêt Billetterie. */}
        <div className="aspect-[820/940] overflow-hidden rounded-t-[1.5rem]">
          <Image
            src="/images/sieges.png"
            alt="Plan des sièges du bus, deux places choisies."
            width={820}
            height={1576}
            sizes="(min-width: 1024px) 14vw, 30vw"
            className="block h-auto w-full"
          />
        </div>
      </Enter>
      <Enter
        trigger="mount"
        y={70}
        delay={0.6}
        duration={0.8}
        className="absolute bottom-[2%] right-[3%] z-30 w-[24%] rotate-2 drop-shadow-[0_24px_30px_rgba(13,18,38,0.4)]"
        style={fadeBottom}
      >
        <Image
          src="/images/clean/billet.png"
          alt="Billet électronique Sira : Dakar, Touba, siège 12A, code QR."
          width={820}
          height={1323}
          sizes="(min-width: 1024px) 13vw, 28vw"
          className="block h-auto w-full rounded-[1.5rem]"
        />
      </Enter>
      <Enter
        trigger="mount"
        delay={0.9}
        y={8}
        duration={0.5}
        className="absolute bottom-[1%] left-[0%] z-[32] rounded-full border border-amber bg-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-amber-ink"
      >
        <span aria-hidden="true">DKR → TBA</span>
      </Enter>
    </div>
  );
}

export function Hero() {
  return (
    <section
      className="relative flex flex-col overflow-hidden bg-paper lg:min-h-[calc(100svh-4.75rem)]"
    >
      <Rings />

      <div className="relative flex flex-1 flex-col lg:min-h-[640px] lg:flex-row lg:items-center">
        <Container className="relative w-full pb-6 pt-12 lg:py-12">
          <div className="lg:max-w-[600px]">
            <Enter trigger="mount" y={14} duration={0.6}>
              <Eyebrow>Pour les compagnies d&apos;autocars d&apos;Afrique de l&apos;Ouest</Eyebrow>
            </Enter>
            <Title2
              as="h1"
              lead="Toute votre compagnie de transport, dans"
              accent="une seule plateforme."
              animate="mount"
              delay={0.1}
              stagger={0.045}
              className="mt-5 text-[2.5rem] sm:text-6xl lg:text-[3.2rem] xl:text-[3.45rem]"
            />
            <Enter trigger="mount" y={18} delay={0.45} duration={0.6}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">
                Flotte, billetterie, colis, équipes et conformité. Sira remplace les cahiers de guichet
                et les tableurs par un outil unique, pensé pour votre exploitation.
              </p>
            </Enter>
            <Enter trigger="mount" y={18} delay={0.55} duration={0.6}>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/demo" variant="primary">
                  Demander une démo
                </ButtonLink>
                <ButtonLink href="/solution" variant="outline">
                  Voir la solution
                </ButtonLink>
              </div>
            </Enter>
          </div>
        </Container>
        <div className="px-6 pb-4 lg:contents lg:p-0"><Collage /></div>
      </div>

      <Container className="relative w-full">
        <div aria-hidden="true" className="border-t-2 border-dashed border-ink/20" />
      </Container>
    </section>
  );
}
