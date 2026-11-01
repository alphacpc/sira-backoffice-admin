"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { EASE, useReduce } from "@/components/motion";

const rotation = { left: "lg:-rotate-2", right: "lg:rotate-2" } as const;

/** Entrée au chargement (héros) : l'inclinaison CSS finale se « pose » depuis un angle plus ouvert. */
export type PhotoEnter = { delay?: number; x?: number; y?: number; rotate?: number };

/**
 * Photo in a rounded card. Tilt only applies from `lg` so it never overflows on mobile.
 *
 * Mouvement : la photo se dévoile par un rideau montant (clip-path) en entrant dans le viewport
 * (ou au chargement avec `enter`), puis dérive de ±20 px avec le défilement (parallaxe).
 * `parallax="page"` lie la dérive au défilement de la page (photos du héros : 0 au sommet).
 */
export function PhotoCard({
  src,
  alt,
  width,
  height,
  rotate,
  sizes = "(min-width: 1024px) 40vw, 90vw",
  priority = false,
  className = "",
  enter,
  parallax = "element",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  rotate?: "left" | "right";
  sizes?: string;
  priority?: boolean;
  className?: string;
  enter?: PhotoEnter;
  parallax?: "element" | "page" | false;
}) {
  const reduce = useReduce();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const { scrollY } = useScroll();
  const yElement = useTransform(scrollYProgress, [0, 1], [20, -20]);
  const yPage = useTransform(scrollY, [0, 700], [0, -24]);

  const cardCls = "overflow-hidden rounded-3xl bg-white shadow-lift";
  const rot = rotate ? rotation[rotate] : "";
  const img = (
    <Image src={src} alt={alt} width={width} height={height} sizes={sizes} priority={priority} className="block h-auto w-full" />
  );

  if (reduce) {
    return (
      <div className={`${cardCls} ${rot} ${className}`}>{img}</div>
    );
  }

  const delay = enter?.delay ?? 0;
  const trigger = enter ? { animate: "show" } : { whileInView: "show", viewport: { once: true, margin: "-60px" } };
  return (
    <motion.div
      ref={ref}
      data-motion=""
      className={`${rot} ${className}`}
      initial="hidden"
      {...trigger}
      variants={{
        hidden: enter
          ? { opacity: 0, x: enter.x ?? 0, y: enter.y ?? 0, rotate: enter.rotate ?? 0 }
          : { opacity: 0, y: 28 },
        show: {
          opacity: 1,
          x: 0,
          y: 0,
          rotate: 0,
          transition: { duration: enter ? 0.8 : 0.7, delay, ease: EASE },
        },
      }}
    >
      <motion.div
        data-motion=""
        className={cardCls}
        style={parallax ? { y: parallax === "page" ? yPage : yElement } : undefined}
      >
        <motion.div
          data-motion=""
          variants={{
            hidden: { clipPath: "inset(0% 0% 100% 0%)", scale: 1.06 },
            show: {
              clipPath: "inset(0% 0% 0% 0%)",
              scale: 1,
              transition: { duration: 0.9, delay: delay + 0.1, ease: EASE },
            },
          }}
        >
          {img}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
