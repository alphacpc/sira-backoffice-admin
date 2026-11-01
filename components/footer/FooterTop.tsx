"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons";
import { EASE, useReduce } from "@/components/motion";

/**
 * Bord perforé : une rangée de demi-disques navy qui mordent sur la page, comme la tranche d'un
 * billet. Aucune couleur de page n'est supposée : seules les bosses navy sont dessinées.
 * Entrée : la rangée se dresse depuis le bas (transform uniquement).
 */
export function PerforatedEdge() {
  const reduce = useReduce();
  const common = "pointer-events-none block h-3.5 w-full";
  const style = {
    backgroundImage: "radial-gradient(circle at 10px 100%, #0d1226 9px, transparent 9.5px)",
    backgroundSize: "20px 100%",
  } as const;
  if (reduce) return <span aria-hidden="true" className={common} style={style} />;
  return (
    <motion.span
      aria-hidden="true"
      data-motion=""
      className={common}
      style={{ ...style, transformOrigin: "50% 100%" }}
      initial={{ scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, ease: EASE }}
    />
  );
}

/**
 * Ligne « DKR ———— TBA » : se trace une fois à l'entrée dans le viewport. Le disque-bus au bout est
 * un vrai bouton : il remonte la page en douceur pendant que le bus glisse le long de la ligne.
 * En mouvement réduit : défilement instantané, aucun glissement.
 */
export function FooterRoute() {
  const reduce = useReduce();
  const wrap = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const inView = useInView(wrap, { once: true, margin: "-40px" });
  const progress = useMotionValue(0);
  const busX = useMotionValue(0);
  const busOpacity = useMotionValue(1);
  const clip = useTransform(progress, (v) => `inset(-20px ${(1 - v) * 100}% -20px 0)`);

  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(progress, 1, { duration: 1.2, delay: 0.15, ease: EASE });
    return () => c.stop();
  }, [inView, reduce, progress]);

  const goTop = async () => {
    if (reduce) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    const l = line.current;
    const b = btn.current;
    if (!l || !b) return;
    const dist = b.offsetLeft - l.offsetLeft;
    await animate(busX, -dist, { duration: 0.9, ease: EASE });
    await animate(busOpacity, 0, { duration: 0.2 });
    busX.set(0);
    animate(busOpacity, 1, { duration: 0.4, ease: EASE });
  };

  return (
    <div ref={wrap} className="flex items-center gap-3 sm:gap-5">
      <span className="font-mono text-xs font-bold tracking-[0.2em] text-white sm:text-sm">DKR</span>
      <span ref={line} className="relative h-[2px] flex-1" aria-hidden="true">
        {reduce ? (
          <span className="absolute inset-x-0 top-0 border-t-2 border-dashed border-amber" />
        ) : (
          <motion.span
            data-motion=""
            className="absolute inset-x-0 top-0 border-t-2 border-dashed border-amber"
            style={{ clipPath: clip }}
          />
        )}
      </span>
      <span className="font-mono text-xs font-bold tracking-[0.2em] text-white sm:text-sm">TBA</span>
      <motion.button
        ref={btn}
        type="button"
        onClick={goTop}
        aria-label="Retour en haut"
        data-motion=""
        style={{ x: busX, opacity: busOpacity, boxShadow: "0 0 0 4px #0d1226" }}
        className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber text-navy transition-colors hover:bg-amber-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber"
      >
        <Icon name="bus" className="h-[18px] w-[18px]" />
      </motion.button>
    </div>
  );
}
