"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE, Stagger, StaggerItem, useReduce } from "@/components/motion";

/** Le fil est à 62 % de la hauteur de l'écran : un arrêt s'anime quand le fil l'atteint. */
const THREAD_MARGIN = "0px 0px -38% 0px";

/**
 * A station on the route. Must be rendered inside `RouteThread`, which owns
 * the geometry (see its comment). The node is the navy disc with an amber ring.
 *
 * `align` decides which side the first child of the body takes from `lg`:
 * "left" keeps the source order, "right" mirrors it (visual first, text second).
 *
 * Mouvement : quand le fil atteint l'arrêt, le nœud apparaît avec une seule onde ambre, le code
 * (FLO, BIL…) se pose lettre par lettre puis le nom de la gare glisse. Le corps (texte, visuel)
 * s'anime par ses propres enveloppes (`StopText`, `Enter`), qui arrivent le long du fil.
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
  const reduce = useReduce();
  return (
    <section id={id} className="relative py-10 lg:py-14">
      {/* Node: centred on the line (mobile x=12, lg x=32). */}
      <motion.span
        aria-hidden="true"
        data-motion=""
        className="absolute top-[2.7rem] -left-[42px] flex h-7 w-7 items-center justify-center rounded-full bg-navy lg:top-[3.7rem] lg:-left-[76px] lg:h-10 lg:w-10"
        style={{ boxShadow: "0 0 0 4px var(--route-bg, #fafafa), 0 0 0 7px #f5a524" }}
        initial={reduce ? false : { scale: 0.3, opacity: 0 }}
        whileInView={reduce ? undefined : { scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: THREAD_MARGIN }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <span className="h-2 w-2 rounded-full bg-amber lg:h-2.5 lg:w-2.5" />
        {!reduce && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[7px] rounded-full border-2 border-amber"
            initial={{ scale: 1, opacity: 0 }}
            whileInView={{ scale: [1, 2.1], opacity: [0.7, 0] }}
            viewport={{ once: true, margin: THREAD_MARGIN }}
            transition={{ duration: 0.9, delay: 0.35, ease: EASE, times: [0, 1] }}
          />
        )}
      </motion.span>

      <Stagger as="header" className="flex items-baseline gap-4" stagger={0.06} margin={THREAD_MARGIN}>
        <span className="text-4xl font-extrabold leading-none tracking-[0.04em] text-navy lg:text-5xl">
          {code.split("").map((ch, i) => (
            <StaggerItem key={i} as="span" y={22} className="inline-block" duration={0.6}>
              {ch}
            </StaggerItem>
          ))}
        </span>
        <StaggerItem as="span" y={0} className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amber-ink">
          {name}
        </StaggerItem>
      </Stagger>

      <div
        className={`mt-5 grid grid-cols-1 items-center gap-8 [&>*]:min-w-0 lg:grid-cols-2 lg:gap-14 ${
          align === "right" ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        {children}
      </div>
    </section>
  );
}
