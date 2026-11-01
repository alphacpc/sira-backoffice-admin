import type { Metadata } from "next";
import { Container, Eyebrow, Title2 } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/icons";
import { Coupon } from "@/components/Coupon";
import { PhotoCard } from "@/components/PhotoCard";
import DemoForm from "@/components/DemoForm";

export const metadata: Metadata = {
  title: "Demander une démo",
  description: "Demandez une démonstration de Sira, adaptée à votre compagnie de transport.",
};

const steps = [
  "Vous décrivez votre exploitation en quelques lignes.",
  "Nous vous répondons pour fixer un créneau.",
  "Nous déroulons la plateforme sur des données d'exemple, adaptée à vos lignes.",
];

export default function DemoPage() {
  return (
    <main className="bg-paper">
      <section className="pb-20 pt-16 lg:pb-28 lg:pt-24">
        <Container className="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-16 [&>*]:min-w-0">
          <Reveal>
            <Eyebrow>Démonstration</Eyebrow>
            <Title2
              as="h1"
              lead="Voyez Sira"
              accent="sur une exploitation comme la vôtre."
              className="mt-4 text-4xl sm:text-5xl [&>span:last-child]:block"
            />
            <ol role="list" className="mt-8 space-y-4">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-ink/80">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber font-mono text-xs font-bold text-navy">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <PhotoCard
              src="/images/clean/voyageuse.jpg"
              alt="Une voyageuse serre contre elle l'arbre de son village, un billet confirmé Dakar-Touba affiché à l'écran."
              width={1920}
              height={1368}
              rotate="left"
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="mt-10 max-w-md"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <Coupon
              notch="#fafafa"
              className="ring-1 ring-navy/10"
              stub={
                <p className="flex items-center gap-2 text-sm text-ink/70">
                  <Icon name="mail" className="h-4 w-4 text-amber-ink" />
                  <a
                    href="mailto:contact@sira.app"
                    className="font-mono hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                  >
                    contact@sira.app
                  </a>
                </p>
              }
            >
              <DemoForm />
            </Coupon>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
