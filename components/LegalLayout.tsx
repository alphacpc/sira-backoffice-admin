import type { LegalSection } from "@/content/legal";
import { Reveal } from "@/components/motion";

export default function LegalLayout({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="bg-white">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgb(245_165_36/0.12),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-3xl px-6 pb-12 pt-20 sm:pt-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Légal
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-primary/60">{intro}</p>
          </Reveal>
        </div>
      </section>

      {/* ===== Sections ===== */}
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <div className="space-y-10">
          {sections.map((section, index) => (
            <Reveal key={section.heading} delay={Math.min(index, 3) * 0.04}>
              <section>
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent-dark">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-xl font-semibold text-primary">
                    {section.heading}
                  </h2>
                </div>
                {section.body.map((paragraph, pIndex) => (
                  <p key={pIndex} className="mt-3 text-primary/60">
                    {paragraph}
                  </p>
                ))}
              </section>
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
