"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE, useReduce } from "@/components/motion";

/**
 * Ticket-style card. With `stub`, the card is split by a dashed perforation
 * with two half-discs cut into its edges, like the Sira e-ticket.
 * `notch` must be the real background colour of the section behind the card.
 *
 * Mouvement : en entrant dans le viewport, la perforation se trace de gauche à droite puis les
 * deux encoches « sautent » en place. `interactive` ajoute un survol (la carte se soulève).
 */
export function Coupon({
  children,
  stub,
  tone = "light",
  notch = "#fafafa",
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  stub?: ReactNode;
  tone?: "light" | "navy";
  notch?: string;
  className?: string;
  interactive?: boolean;
}) {
  const reduce = useReduce();
  const navy = tone === "navy";
  const notchStyle = { backgroundColor: notch, boxShadow: navy ? undefined : "inset 0 0 0 1px rgb(30 39 73 / 0.1)" };
  const lift = interactive ? "transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lift" : "";
  const Root = reduce ? "div" : motion.div;
  const rootMotion = reduce
    ? {}
    : { initial: "hidden", whileInView: "show", viewport: { once: true, margin: "-80px" } };
  const Notch = reduce ? "span" : motion.span;
  const notchMotion = (delay: number) =>
    reduce
      ? {}
      : {
          "data-motion": "",
          variants: {
            hidden: { scale: 0 },
            show: { scale: 1, transition: { duration: 0.45, delay, ease: [0.34, 1.4, 0.64, 1] as const } },
          },
        };
  const Line = reduce ? "div" : motion.div;
  const lineMotion = reduce
    ? {}
    : {
        "data-motion": "",
        variants: {
          hidden: { clipPath: "inset(0% 100% 0% 0%)" },
          show: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 0.8, delay: 0.25, ease: EASE } },
        },
      };
  return (
    <Root
      {...rootMotion}
      className={`relative flex flex-col overflow-hidden rounded-3xl ${
        navy ? "bg-navy text-white" : "bg-white text-ink shadow-soft"
      } ${lift} ${className}`}
    >
      <div className="flex-1 p-6 lg:p-8">{children}</div>
      {stub ? (
        <>
          <div className="relative">
            <Notch
              {...notchMotion(0.75)}
              aria-hidden="true"
              className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full"
              style={notchStyle}
            />
            <Notch
              {...notchMotion(0.85)}
              aria-hidden="true"
              className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full"
              style={notchStyle}
            />
            <Line
              {...lineMotion}
              aria-hidden="true"
              className={`mx-6 border-t-2 border-dashed ${navy ? "border-white/25" : "border-navy/20"}`}
            />
          </div>
          <div className="p-6 lg:p-8">{stub}</div>
        </>
      ) : null}
    </Root>
  );
}
