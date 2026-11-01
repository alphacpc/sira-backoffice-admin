"use client";

import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { EASE, useReduce } from "@/components/motion";

/** Vrai après le premier montage client : le premier chargement (SSR) n'est jamais masqué. */
let hasNavigated = false;

/**
 * Fondu d'entrée du contenu à chaque navigation (l'en-tête et le pied de page, hors de ce
 * gabarit, ne bougent pas). Pas d'animation de sortie : peu fiable dans l'App Router.
 * `overflow-x: clip` empêche les translations d'entrée de créer un défilement horizontal.
 */
export default function Template({ children }: { children: ReactNode }) {
  const reduce = useReduce();
  const animateIn = useRef(hasNavigated);
  useEffect(() => {
    hasNavigated = true;
    // Une ancre (#colis) a été calculée pendant la translation de 8 px : on la recale en fin d'entrée.
    const hash = window.location.hash;
    if (!animateIn.current || !hash) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    }, 420);
    return () => window.clearTimeout(t);
  }, []);

  if (reduce || !animateIn.current) {
    return <div className="overflow-x-clip">{children}</div>;
  }
  return (
    <motion.div
      data-motion=""
      className="overflow-x-clip"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
