import type { Metadata } from "next";
import { Container, Eyebrow, Title2 } from "@/components/ui";
import { Reveal } from "@/components/motion";
import PlanTable from "@/components/PlanTable";
import { plans } from "@/content/plans";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Trois niveaux d'offre pour les compagnies de transport, établis sur devis.",
};

export default function PricingPage() {
  return (
    <main className="bg-paper">
      <section className="pb-6 pt-16 lg:pt-24">
        <Container>
          <Reveal>
            <Eyebrow>Tarifs</Eyebrow>
            <Title2
              as="h1"
              lead="Une offre composée"
              accent="pour votre compagnie."
              className="mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl [&>span:last-child]:block"
            />
            <p className="mt-6 max-w-2xl text-lg text-ink/75">
              Les plans, leurs limites et les fonctions activées sont configurés pour chaque
              compagnie. Les trois niveaux ci-dessous sont des exemples de compositions courantes,
              pas des forfaits figés; le tarif est établi sur devis, selon la taille de la flotte.
            </p>
          </Reveal>
        </Container>
      </section>
      <section className="py-12">
        <Container>
          <PlanTable plans={plans} />
        </Container>
      </section>
      <section className="pb-24">
        <Container className="max-w-3xl">
          <p className="rounded-2xl border-2 border-dashed border-navy/25 p-5 text-sm text-ink/70">
            Une période d&apos;essai peut être prévue selon le plan. Les montants, devises
            (XOF, EUR, USD) et cycles de facturation (mensuel ou annuel) sont précisés dans le devis.
          </p>
        </Container>
      </section>
    </main>
  );
}
