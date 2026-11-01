import { Container, Eyebrow, ButtonLink, Title2 } from "@/components/ui";
import { Enter, Drift } from "@/components/motion";
import { PhotoCard } from "@/components/PhotoCard";

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
    <div className="relative mx-auto mt-4 aspect-[1/1.02] w-full max-w-[460px] lg:absolute lg:inset-y-0 lg:right-0 lg:mx-0 lg:mt-0 lg:aspect-auto lg:w-[52%] lg:max-w-none">
      {/* Cadre ambre décalé : donne du relief à la photo sans aplat sombre. */}
      <Enter
        trigger="mount"
        aria-hidden="true"
        clip="left"
        fade={false}
        delay={0.1}
        duration={0.85}
        className="absolute bottom-[0%] left-[8%] right-[4%] top-[4%] rounded-3xl border-2 border-amber/60 bg-amber/10 lg:bottom-[4%] lg:left-[19%] lg:right-[-1%] lg:top-[9%] lg:rotate-2"
      />
      <PhotoCard
        src="/images/clean/gestionnaire-laptop.png"
        alt="Une gestionnaire de compagnie de transport consulte Sira sur son ordinateur portable"
        width={1920}
        height={1959}
        priority
        enter={{ delay: 0.25, x: 40, y: 40, rotate: 4 }}
        parallax="page"
        sizes="(min-width: 1024px) 560px, 80vw"
        className="absolute bottom-[2%] left-[2%] z-10 w-[84%] -rotate-2 lg:bottom-[5%] lg:left-[14%] lg:w-[min(76%,520px)] lg:-rotate-3 [&>div]:rounded-3xl [&_img]:object-cover [&_img]:object-[50%_30%]"
      />
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
