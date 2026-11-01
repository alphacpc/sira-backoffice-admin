import type { ReactNode } from "react";
import type { Tone } from "@/content/mock-data";

const caption = (
  <figcaption className="mt-3 text-center text-xs text-ink/70">
    Maquette — données fictives
  </figcaption>
);

export function BrowserFrame({
  url,
  children,
  className = "",
}: {
  url: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-lift">
        <div className="flex items-center gap-2 border-b border-ink/10 bg-sand/70 px-4 py-2.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ink/20" />
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ink/20" />
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ink/20" />
          <span className="ml-3 truncate rounded-md bg-white px-3 py-1 text-xs text-ink/70">
            {url}
          </span>
        </div>
        {children}
      </div>
      {caption}
    </figure>
  );
}

export function PhoneShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="mx-auto w-[272px] overflow-hidden rounded-[2.4rem] border-[7px] border-ink bg-cream shadow-lift">
        <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-ink/20" />
        {children}
      </div>
      {caption}
    </figure>
  );
}

const tones: Record<Tone, string> = {
  ok: "bg-forest/10 text-forest",
  warn: "bg-accent-soft text-accent-ink",
  idle: "bg-ink/8 text-ink/70",
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
