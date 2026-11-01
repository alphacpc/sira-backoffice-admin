import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/icons";
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
    <main>
      <section className="py-16 lg:py-24">
        <Container className="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_1.1fr] [&>*]:min-w-0">
          <Reveal>
            <Eyebrow>Démonstration</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              Voyez Sira sur une exploitation comme la vôtre.
            </h1>
            <ol className="mt-8 space-y-4">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-ink/80">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="mt-8 flex items-center gap-2 text-sm text-ink/70">
              <Icon name="mail" className="h-4 w-4" />
              contact@sira.app
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="rounded-3xl border border-ink/10 bg-white p-7 sm:p-9">
              <DemoForm />
            </div>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
