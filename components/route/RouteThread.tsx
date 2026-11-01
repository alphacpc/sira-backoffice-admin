"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Icon } from "@/components/icons";

/**
 * Vertical route that is drawn while the page scrolls, like the dashed line of
 * the Sira ticket (DKR ····· TBA). The tip carries a small bus.
 *
 * Geometry contract shared with `Stop`: on mobile the line sits 12px from the
 * left edge of the container (container padding 40px); from `lg` it sits 32px
 * from the left edge (container padding 88px).
 *
 * `background` must be the real background colour of the surrounding section:
 * stops use it to cut a clean gap in the dashes around their node.
 */
export function RouteThread({
  children,
  background = "#fafafa",
  className = "",
}: {
  children: ReactNode;
  background?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const height = useMotionValue(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.62", "end 0.62"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });

  const clip = useTransform(smooth, (v) => `inset(0 0 ${(1 - Math.min(Math.max(v, 0), 1)) * 100}% 0)`);
  const busY = useTransform([smooth, height], ([v, h]: number[]) => Math.min(Math.max(v, 0), 1) * h);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => height.set(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);


  return (
    <div
      ref={ref}
      className={`relative pl-10 lg:pl-[88px] ${className}`}
      style={{ "--route-bg": background } as CSSProperties}
    >
      {/* Mobile: a plain thin line, no animation. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-[11px] w-0.5 rounded-full bg-amber/60 lg:hidden"
      />

      {/* Desktop: dashed route drawn with the scroll. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-16 lg:block"
      >
        <svg className="absolute inset-0 h-full w-full overflow-visible" fill="none">
          <line
            x1="32"
            x2="32"
            y1="0"
            y2="100%"
            stroke="#f5a524"
            strokeOpacity="0.28"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="6 10"
          />
        </svg>
        <motion.svg
          data-motion=""
          className="absolute inset-0 h-full w-full overflow-visible"
          fill="none"
          style={reduce ? undefined : { clipPath: clip }}
        >
          <line
            x1="32"
            x2="32"
            y1="0"
            y2="100%"
            stroke="#f5a524"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="6 10"
          />
        </motion.svg>

        {reduce ? (
          <div className="absolute bottom-0 left-8 -translate-x-1/2 translate-y-1/2">
            <BusTip />
          </div>
        ) : (
          <motion.div
            className="absolute left-8 top-0 -ml-[18px] -mt-[18px] will-change-transform"
            style={{ y: busY }}
          >
            <BusTip />
          </motion.div>
        )}
      </div>

      {children}
    </div>
  );
}

function BusTip() {
  return (
    <span
      className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-navy"
      style={{ boxShadow: "0 0 0 4px var(--route-bg), 0 0 0 5.5px rgb(30 39 73 / 0.9)" }}
    >
      <Icon name="bus" className="h-[18px] w-[18px]" />
    </span>
  );
}
