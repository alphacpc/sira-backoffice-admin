import { Container, Eyebrow, ButtonLink, Title2 } from "@/components/ui";
import { Enter } from "@/components/motion";
import { PhotoCard } from "@/components/PhotoCard";

export function Hero() {
  return (
    <section className="relative flex flex-col overflow-hidden bg-paper">
      <Container className="relative grid grid-cols-1 items-center gap-10 py-12 lg:min-h-[calc(100svh-4.75rem-2px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:gap-16 lg:py-14 [&>*]:min-w-0">
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

        <div className="mx-auto w-full max-w-[440px] lg:ml-auto lg:mr-0 lg:max-w-[500px]">
          <PhotoCard
            src="/images/clean/gestionnaire-laptop.png"
            alt="Une gestionnaire de compagnie de transport consulte Sira sur son ordinateur portable"
            width={1920}
            height={1959}
            priority
            enter={{ delay: 0.25, x: 30, y: 30, rotate: 3 }}
            parallax="page"
            sizes="(min-width: 1024px) 500px, 90vw"
            className="w-full lg:-rotate-2 [&>div]:rounded-3xl [&_img]:object-cover [&_img]:object-[50%_30%]"
          />
        </div>
      </Container>

      <Container className="relative w-full">
        <div aria-hidden="true" className="border-t-2 border-dashed border-ink/20" />
      </Container>
    </section>
  );
}
