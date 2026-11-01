import type { LegalSection } from "@/content/legal";
import { HeroBlock, Reveal } from "@/components/motion";
import { Eyebrow, Title2 } from "@/components/ui";

export default function LegalLayout({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  const words = title.split(" ");
  const accent = words.pop() ?? "";
  const lead = words.join(" ");
  return (
    <main className="bg-white">
      <section className="border-b border-navy/10">
        <div className="mx-auto max-w-[70ch] px-6 pb-12 pt-16 lg:pt-24">
          <div>
<HeroBlock>
            <Eyebrow>Légal</Eyebrow>
            <Title2
              as="h1"
              lead={lead}
              accent={accent}
              className="mt-4 text-4xl sm:text-5xl"
            />
            <p className="mt-5 text-lg text-ink/70">{intro}</p>
          </HeroBlock>
</div>
        </div>
      </section>

      <div className="mx-auto max-w-[70ch] px-6 pb-24 pt-12">
        <div className="space-y-10">
          {sections.map((section, index) => (
            <Reveal key={section.heading} delay={Math.min(index, 3) * 0.04}>
              <section className="grid grid-cols-[2.5rem_1fr] gap-x-3 [&>*]:min-w-0">
                <span className="pt-1.5 font-mono text-xs font-bold tracking-[0.18em] text-amber-ink">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="text-xl font-bold text-navy">{section.heading}</h2>
                  {section.body.map((paragraph, pIndex) => (
                    <p key={pIndex} className="mt-3 text-ink/75">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
