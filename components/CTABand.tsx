import Link from "next/link";

export default function CTABand({
  title = "Prêt à découvrir Sira ?",
  description = "Demandez une démonstration et voyez ce que la plateforme peut changer pour votre compagnie.",
  primaryHref = "/contact",
  primaryLabel = "Demander une démo",
  secondaryHref,
  secondaryLabel,
}: {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="relative mt-20 overflow-hidden rounded-3xl bg-primary p-10 text-center text-white sm:p-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgb(245_165_36/0.25),transparent_60%)]"
      />
      <div className="relative">
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/80">{description}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href={primaryHref}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:-translate-y-0.5 hover:bg-accent-dark"
          >
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel && (
            <Link
              href={secondaryHref}
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/60"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
