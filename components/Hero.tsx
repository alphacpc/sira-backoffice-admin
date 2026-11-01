import Link from "next/link";
import { Reveal } from "@/components/motion";
import PaymentMethods from "@/components/PaymentMethods";
import DashboardPreview from "@/components/previews/DashboardPreview";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Lueur d'ambiance discrète */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgb(245_165_36/0.10),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-24 text-center sm:pt-32">
        <Reveal>
          <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-primary-deep sm:text-6xl">
            Le transport interurbain,
            <br className="hidden sm:block" />
            <span className="text-gradient"> enfin unifié.</span>
          </h1>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="mx-auto mt-7 max-w-2xl text-xl leading-relaxed text-primary/60 sm:text-2xl">
            Flotte, billetterie, colis, ressources humaines et facturation —
            réunis dans une seule plateforme multi-tenant, pensée pour les
            compagnies d&apos;Afrique de l&apos;Ouest.
          </p>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="mt-11 flex flex-wrap justify-center gap-5">
            <Link
              href="/contact"
              className="rounded-full bg-accent px-9 py-4 text-base font-semibold text-primary-deep transition hover:bg-accent-dark sm:text-lg"
            >
              Demander une démo
            </Link>
            <Link
              href="/tarifs"
              className="rounded-full border border-primary/20 px-9 py-4 text-base font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5 sm:text-lg"
            >
              Voir les tarifs
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-12">
            <p className="text-sm font-medium text-primary/45">
              Paiements intégrés
            </p>
            <div className="mt-4 flex justify-center">
              <PaymentMethods />
            </div>
          </div>
        </Reveal>
      </div>

      {/* Capture produit */}
      <div className="relative mx-auto max-w-5xl px-6 pb-24">
        <Reveal delay={0.28}>
          <DashboardPreview />
        </Reveal>
      </div>
    </section>
  );
}
