import type { ReactNode } from "react";
import { Reveal } from "@/components/motion";

/**
 * A station on the route. Must be rendered inside `RouteThread`, which owns
 * the geometry (see its comment). The node is the navy disc with an amber ring.
 *
 * `align` decides which side the first child of the body takes from `lg`:
 * "left" keeps the source order, "right" mirrors it (visual first, text second).
 */
export function Stop({
  code,
  name,
  align = "left",
  id,
  children,
}: {
  code: string;
  name: string;
  align?: "left" | "right";
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative py-10 lg:py-14">
      {/* Node: centred on the line (mobile x=12, lg x=32). */}
      <span
        aria-hidden="true"
        className="absolute top-[2.7rem] -left-[42px] flex h-7 w-7 items-center justify-center rounded-full bg-navy lg:top-[3.7rem] lg:-left-[76px] lg:h-10 lg:w-10"
        style={{ boxShadow: "0 0 0 4px var(--route-bg, #fafafa), 0 0 0 7px #f5a524" }}
      >
        <span className="h-2 w-2 rounded-full bg-amber lg:h-2.5 lg:w-2.5" />
      </span>

      <Reveal>
        <header className="flex items-baseline gap-4">
          <span className="text-4xl font-extrabold leading-none tracking-[0.04em] text-navy lg:text-5xl">
            {code}
          </span>
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amber-ink">
            {name}
          </span>
        </header>
        <div
          className={`mt-5 grid grid-cols-1 items-center gap-8 [&>*]:min-w-0 lg:grid-cols-2 lg:gap-14 ${
            align === "right" ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          {children}
        </div>
      </Reveal>
    </section>
  );
}
