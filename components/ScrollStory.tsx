"use client";

import {
  Children,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import { Icon } from "@/components/icons";

export type StoryStep = {
  eyebrow: string;
  title: string;
  description: string;
  points?: string[];
  /** Dégradé CSS de fond propre à l'étape. */
  bg?: string;
};

/** Cercles ancrés aux extrémités, d'épaisseurs très différentes, animés. */
const ARCS = [
  { side: "tl", size: 560, border: 1, opacity: 0.4, dur: 7, delay: 0 },
  { side: "tl", size: 300, border: 8, opacity: 0.42, dur: 8, delay: 0.5 },
  { side: "tr", size: 500, border: 4, opacity: 0.4, dur: 7.5, delay: 1 },
  { side: "tr", size: 250, border: 12, opacity: 0.42, dur: 8.5, delay: 1.5 },
  { side: "bl", size: 480, border: 2, opacity: 0.4, dur: 7, delay: 2 },
  { side: "bl", size: 230, border: 7, opacity: 0.42, dur: 8, delay: 2.5 },
  { side: "br", size: 620, border: 14, opacity: 0.35, dur: 7.5, delay: 3 },
  { side: "br", size: 360, border: 5, opacity: 0.42, dur: 8.5, delay: 3.5 },
  { side: "t", size: 380, border: 1, opacity: 0.4, dur: 7, delay: 4 },
  { side: "b", size: 420, border: 6, opacity: 0.4, dur: 8, delay: 4.5 },
  { side: "l", size: 320, border: 9, opacity: 0.4, dur: 7.5, delay: 5 },
  { side: "r", size: 280, border: 3, opacity: 0.42, dur: 8, delay: 5.5 },
];

const ARC_DOTS = [
  { side: "tl", size: 12, offset: 90 },
  { side: "tr", size: 10, offset: 120 },
  { side: "bl", size: 9, offset: 70 },
  { side: "br", size: 14, offset: 150 },
  { side: "t", size: 8, offset: 60 },
  { side: "b", size: 11, offset: 80 },
];

function arcStyle(arc: (typeof ARCS)[number]): CSSProperties {
  const half = arc.size / 2;
  const style: CSSProperties = {
    width: arc.size,
    height: arc.size,
    borderWidth: arc.border,
    borderColor: "#f5a524",
    borderStyle: "solid",
    opacity: arc.opacity,
    animation: `ring-pulse ${arc.dur}s ease-in-out ${arc.delay}s infinite`,
  };
  switch (arc.side) {
    case "tl":
      style.left = -half;
      style.top = -half;
      break;
    case "tr":
      style.right = -half;
      style.top = -half;
      break;
    case "bl":
      style.left = -half;
      style.bottom = -half;
      break;
    case "br":
      style.right = -half;
      style.bottom = -half;
      break;
    case "t":
      style.left = `calc(50% - ${half}px)`;
      style.top = -half;
      break;
    case "b":
      style.left = `calc(50% - ${half}px)`;
      style.bottom = -half;
      break;
    case "l":
      style.left = -half;
      style.top = `calc(50% - ${half}px)`;
      break;
    case "r":
      style.right = -half;
      style.top = `calc(50% - ${half}px)`;
      break;
  }
  return style;
}

const DEFAULT_BG = "linear-gradient(135deg, #1e2749 0%, #141a36 100%)";

/**
 * Section « scrollytelling » : une grande zone épinglée à l'écran pendant que
 * le défilement fait défiler les étapes (texte + illustration + couleur de
 * fond changent), puis on sort normalement de la section.
 *
 * `children` doit contenir exactement un visuel par étape, dans l'ordre.
 */
export default function ScrollStory({
  steps,
  children,
}: {
  steps: StoryStep[];
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const visuals = Children.toArray(children);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const index = Math.min(
      steps.length - 1,
      Math.max(0, Math.floor(value * steps.length))
    );
    setActive(index);
  });

  const step = steps[active];

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: `${steps.length * 100}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden bg-primary">
        {/* Fond animé (change de couleur à chaque étape) */}
        <AnimatePresence initial={false}>
          <motion.div
            key={`bg-${active}`}
            className="absolute inset-0"
            style={{ background: step.bg ?? DEFAULT_BG }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          />
        </AnimatePresence>

        {/* Cercles ancrés aux extrémités */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {ARCS.map((arc, index) => (
            <span
              key={`arc-${index}`}
              className="absolute rounded-full"
              style={arcStyle(arc)}
            />
          ))}
          {ARC_DOTS.map((dot, index) => {
            const style: CSSProperties = {
              width: dot.size,
              height: dot.size,
              opacity: 0.6,
            };
            if (dot.side === "tl") {
              style.left = dot.offset;
              style.top = dot.offset;
            } else if (dot.side === "tr") {
              style.right = dot.offset;
              style.top = dot.offset;
            } else if (dot.side === "bl") {
              style.left = dot.offset;
              style.bottom = dot.offset;
            } else if (dot.side === "br") {
              style.right = dot.offset;
              style.bottom = dot.offset;
            } else if (dot.side === "t") {
              style.left = "50%";
              style.top = dot.offset;
              style.transform = "translateX(-50%)";
            } else {
              style.left = "50%";
              style.bottom = dot.offset;
              style.transform = "translateX(-50%)";
            }
            return (
              <span
                key={`dot-${index}`}
                className="absolute rounded-full bg-accent"
                style={style}
              />
            );
          })}
        </div>

        {/* Halos décoratifs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        </div>

        {/* Logo Sira en filigrane */}
        <img
          src="/images/sira-horizontal-dark.svg"
          alt="Sira"
          className="absolute bottom-8 left-6 hidden h-7 w-auto opacity-40 sm:block"
        />

        <div className="relative mx-auto w-full max-w-7xl px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -28 }}
              transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
            >
              <div className="max-w-xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-accent">
                    {String(active + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px w-8 bg-accent/40" />
                  <p className="text-sm font-semibold uppercase tracking-widest text-accent sm:text-base">
                    {step.eyebrow}
                  </p>
                </div>

                <h2 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {step.title}
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-white/70 sm:text-xl">
                  {step.description}
                </p>

                {step.points && (
                  <ul className="mt-8 space-y-3.5">
                    {step.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-3 text-white/90"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20">
                          <Icon name="check" className="h-3 w-3 text-accent" />
                        </span>
                        <span className="text-base sm:text-lg">{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="relative flex justify-center lg:justify-end">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(245_165_36/0.14),transparent_65%)]"
                />
                <div className="relative">{visuals[active]}</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicateurs de progression */}
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {steps.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === active ? "w-8 bg-accent" : "w-2 bg-white/25"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
