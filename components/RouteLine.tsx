"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons";
import { EASE, useReduce } from "@/components/motion";

/**
 * Ligne pointillée « DKR ——— TBA » du coupon final. En entrant dans le viewport elle se trace de
 * gauche à droite et un bus (même disque ambre que le fil de route) la parcourt une seule fois,
 * puis s'efface à l'arrivée : l'état final est identique à la ligne statique d'origine.
 */
export function RouteLine({ className = "" }: { className?: string }) {
  const reduce = useReduce();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const progress = useMotionValue(0);
  const width = useMotionValue(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => width.set(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(progress, 1, { duration: 1.5, delay: 0.2, ease: EASE });
    return () => c.stop();
  }, [inView, reduce, progress]);

  const clip = useTransform(progress, (v) => `inset(-20px ${(1 - v) * 100}% -20px 0)`);
  const busX = useTransform([progress, width], ([v, w]: number[]) => v * Math.max(w - 28, 0));
  const busOpacity = useTransform(progress, [0, 0.06, 0.9, 1], [0, 1, 1, 0]);

  const dashed = "absolute inset-x-0 top-0 border-t-2 border-dashed border-amber";
  return (
    <span ref={ref} className={`relative h-[2px] ${className}`}>
      {reduce ? (
        <span className={dashed} />
      ) : (
        <>
          <motion.span data-motion="" className={dashed} style={{ clipPath: clip }} />
          <motion.span
            aria-hidden="true"
            className="absolute left-0 top-[-13px] flex h-7 w-7 items-center justify-center rounded-full bg-amber text-navy will-change-transform"
            style={{ x: busX, opacity: busOpacity, boxShadow: "0 0 0 4px #1e2749" }}
          >
            <Icon name="bus" className="h-[15px] w-[15px]" />
          </motion.span>
        </>
      )}
    </span>
  );
}
