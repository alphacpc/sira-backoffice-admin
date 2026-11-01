import { Container, Eyebrow, ButtonLink, Title2 } from "@/components/ui";
import { Enter } from "@/components/motion";
import { PhotoCard } from "@/components/PhotoCard";

function Collage() {
  return (
    <div className="relative mx-auto mt-4 aspect-[1/1.02] w-full max-w-[460px] lg:absolute lg:inset-y-0 lg:right-0 lg:mx-0 lg:mt-0 lg:aspect-auto lg:w-[52%] lg:max-w-none">
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
