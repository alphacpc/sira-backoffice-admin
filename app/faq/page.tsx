import FaqAccordion from "@/components/FaqAccordion";
import CTABand from "@/components/CTABand";
import { Reveal } from "@/components/motion";
import { faqItems } from "@/content/faq";

export default function FaqPage() {
  return (
    <main className="bg-white">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgb(245_165_36/0.12),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-4xl px-6 pb-12 pt-20 sm:pt-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              FAQ
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              Questions <span className="text-gradient">fréquentes.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-primary/60">
              Les réponses aux questions les plus courantes sur Sira. Une autre
              question ? Écrivez-nous.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Accordéon ===== */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <Reveal>
          <FaqAccordion items={faqItems} />
        </Reveal>
      </section>

      {/* ===== CTA ===== */}
      <div className="mx-auto max-w-4xl px-6 pb-24">
        <CTABand
          title="Une autre question ?"
          description="Écrivez-nous, nous vous répondrons avec plaisir."
          primaryLabel="Nous contacter"
        />
      </div>
    </main>
  );
}
