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
    <main className="bg-cream">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-cream">
        <div className="relative mx-auto max-w-3xl px-6 pb-12 pt-20 sm:pt-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-ink">
              Légal
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink/70">{intro}</p>
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
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-forest/10 text-xs font-bold text-forest">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-xl font-semibold text-ink">
                    {section.heading}
                  </h2>
                </div>
                {section.body.map((paragraph, pIndex) => (
                  <p key={pIndex} className="mt-3 text-ink/70">
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
