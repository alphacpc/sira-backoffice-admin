import { Reveal } from "@/components/motion";

export default function PageIntro({
  title,
  intro,
}: {
  title: string;
  intro: string;
}) {
  return (
    <Reveal>
      <h1 className="text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-primary/60">{intro}</p>
    </Reveal>
  );
}
