import { Reveal } from "@/components/motion";

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Reveal>
      <div className="mx-auto max-w-2xl text-center">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2 text-3xl font-bold text-primary sm:text-4xl">
          {title}
        </h2>
        {subtitle && <p className="mt-4 text-primary/70">{subtitle}</p>}
      </div>
    </Reveal>
  );
}
