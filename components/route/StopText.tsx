"use client";

import Link from "next/link";
import { Stagger, StaggerItem } from "@/components/motion";
import type { Chapter } from "@/content/solution";

/**
 * Text side of a stop: title, description, at most three points, link.
 * Le bloc arrive par son bord extérieur (28 px ; `side="left"` = côté du fil), puis ses éléments montent un à un ;
 * le trait ambre de chaque point se dessine de gauche à droite.
 */
export function StopText({ c, dark = false, side = "left" }: { c: Chapter; dark?: boolean; side?: "left" | "right" }) {
  return (
    <Stagger x={side === "left" ? -28 : 28} stagger={0.09} delay={0.1}>
      <StaggerItem as="h3" className={`text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl lg:text-[2.6rem] ${dark ? "text-white" : "text-navy"}`}>
        {c.tagline}
      </StaggerItem>
      <StaggerItem as="p" className={`mt-5 max-w-lg text-base leading-relaxed ${dark ? "text-white/80" : "text-ink/75"}`}>
        {c.description}
      </StaggerItem>
      <ul className="mt-6 max-w-lg space-y-3">
        {c.points.slice(0, 3).map((p) => (
          <StaggerItem
            as="li"
            key={p}
            className={`flex gap-3 border-t pt-3 text-sm leading-relaxed ${
              dark ? "border-white/15 text-white/85" : "border-navy/10 text-ink/80"
            }`}
          >
            <StaggerItem as="span" scaleX className="mt-[7px] h-1.5 w-4 shrink-0 rounded-full bg-amber" />
            {p}
          </StaggerItem>
        ))}
      </ul>
      <StaggerItem>
        <Link
          href={`/solution#${c.id}`}
          className={`group mt-7 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.16em] focus-visible:outline-2 focus-visible:outline-offset-4 ${
            dark ? "text-amber focus-visible:outline-amber" : "text-navy focus-visible:outline-navy"
          }`}
        >
          <span className="border-b-2 border-amber pb-0.5 transition-[padding] duration-300 group-hover:pb-1 group-focus-visible:pb-1">
            Voir le détail
          </span>
          <span aria-hidden="true" className="transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5">
            →
          </span>
        </Link>
      </StaggerItem>
    </Stagger>
  );
}
