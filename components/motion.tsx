"use client";

import { motion, useInView, useReducedMotion, useScroll, useTransform, animate } from "motion/react";
import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

export { EASE };

/**
 * `prefers-reduced-motion`, sans écart d'hydratation : le premier rendu client est identique au
 * rendu serveur (mouvement actif), la préférence n'est lue qu'après le montage. Entre-temps le CSS
 * (`[data-motion]` sous media query) force déjà l'état final visible, donc aucun clignotement.
 */
export function useReduce(): boolean {
  const pref = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!pref;
}

/**
 * Mouvement : décélération franche (le bus qui arrive), 0,5 à 0,9 s, retards de 60 à 90 ms.
 * Seuls transform, opacity et clip-path sont animés. En `prefers-reduced-motion` aucun composant
 * ne bouge : ils rendent leur balisage final. Le CSS (`[data-motion]`, voir globals.css) garantit
 * en plus qu'un état initial caché venu du serveur ne reste jamais visible-nul.
 */

const CLIP = {
  bottom: "inset(0% 0% 100% 0%)",
  top: "inset(100% 0% 0% 0%)",
  left: "inset(0% 100% 0% 0%)",
  right: "inset(0% 0% 0% 100%)",
} as const;
const CLIP_SHOWN = "inset(0% 0% 0% 0%)";

export type EnterProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  /** Rideau (clip-path) : le côté indiqué est celui qui reste caché au départ. */
  clip?: keyof typeof CLIP;
  fade?: boolean;
  /** `mount` : au chargement (héros). `view` : à l'entrée dans le viewport. */
  trigger?: "mount" | "view";
  margin?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

/** Brique générale d'entrée : fondu + translation/échelle/rotation/rideau. */
export function Enter({
  children,
  className,
  style,
  delay = 0,
  duration = 0.6,
  x = 0,
  y = 0,
  scale = 1,
  rotate = 0,
  clip,
  fade = true,
  trigger = "view",
  margin = "-80px",
  ...aria
}: EnterProps) {
  const reduce = useReduce();
  if (reduce) {
    return (
      <div className={className} style={style} {...aria}>
        {children}
      </div>
    );
  }
  const hidden = { opacity: fade ? 0 : 1, x, y, scale, rotate, ...(clip ? { clipPath: CLIP[clip] } : {}) };
  const shown = { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, ...(clip ? { clipPath: CLIP_SHOWN } : {}) };
  return (
    <motion.div
      data-motion=""
      className={className}
      style={style}
      initial={hidden}
      {...(trigger === "mount"
        ? { animate: shown }
        : { whileInView: shown, viewport: { once: true, margin } })}
      transition={{ duration, delay, ease: EASE }}
      {...aria}
    >
      {children}
    </motion.div>
  );
}

/** Révèle un bloc à l'entrée dans le viewport (fondu + translation). */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  x = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  className?: string;
}) {
  return (
    <Enter className={className} delay={delay} y={y} x={x} duration={0.55}>
      {children}
    </Enter>
  );
}

type Tag = "div" | "li" | "span" | "h3" | "p" | "header" | "ul";
const M = { div: motion.div, li: motion.li, span: motion.span, h3: motion.h3, p: motion.p, header: motion.header, ul: motion.ul } as const;

/**
 * Conteneur d'une cascade : les `StaggerItem` descendants (à n'importe quelle profondeur)
 * apparaissent l'un après l'autre. `x` fait glisser tout le groupe depuis un côté.
 */
export function Stagger({
  as = "div",
  children,
  className,
  stagger = 0.08,
  delay = 0,
  x = 0,
  trigger = "view",
  margin = "-80px",
}: {
  as?: Tag;
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  x?: number;
  trigger?: "mount" | "view";
  margin?: string;
}) {
  const reduce = useReduce();
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  const Comp = M[as];
  return (
    <Comp
      data-motion=""
      className={className}
      initial="hidden"
      {...(trigger === "mount"
        ? { animate: "show" }
        : { whileInView: "show", viewport: { once: true, margin } })}
      variants={{
        hidden: { opacity: x ? 0 : 1, x },
        show: {
          opacity: 1,
          x: 0,
          transition: { duration: 0.7, ease: EASE, staggerChildren: stagger, delayChildren: delay },
        },
      }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({
  as = "div",
  children,
  className,
  y = 16,
  scaleX,
  duration = 0.55,
  origin,
}: {
  as?: Tag;
  children?: ReactNode;
  className?: string;
  y?: number;
  /** Dessine l'élément de gauche à droite (trait ambre). */
  scaleX?: boolean;
  duration?: number;
  origin?: string;
}) {
  const reduce = useReduce();
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  const Comp = M[as];
  return (
    <Comp
      data-motion=""
      className={className}
      style={origin || scaleX ? { transformOrigin: origin ?? "left center" } : undefined}
      variants={{
        hidden: scaleX ? { scaleX: 0 } : { opacity: 0, y },
        show: scaleX
          ? { scaleX: 1, transition: { duration: 0.5, ease: EASE } }
          : { opacity: 1, y: 0, transition: { duration, ease: EASE } },
      }}
    >
      {children}
    </Comp>
  );
}

/**
 * Découpe un titre en mots qui montent à tour de rôle. Le texte reste une seule phrase dans le DOM
 * (mots séparés par de vraies espaces), donc lisible tel quel par les lecteurs d'écran.
 */
export function AnimatedTitle({
  as: Tag = "h2",
  lead,
  accent,
  tone = "light",
  className = "",
  trigger = "view",
  delay = 0,
  stagger = 0.05,
}: {
  as?: "h1" | "h2" | "h3";
  lead: string;
  accent: string;
  tone?: "light" | "dark";
  className?: string;
  trigger?: "mount" | "view";
  delay?: number;
  stagger?: number;
}) {
  const reduce = useReduce();
  const leadCls = tone === "dark" ? "text-white" : "text-navy";
  const accentCls = tone === "dark" ? "text-amber" : "text-[#c27800]";
  const base = `font-sans font-extrabold leading-[1.05] tracking-tight ${className}`;
  const words = (text: string, cls: string) =>
    text.split(" ").map((w, i, arr) => (
      <span key={`${cls}-${i}`} className={cls}>
        {reduce ? (
          w
        ) : (
          <motion.span
            data-motion=""
            className="inline-block"
            variants={{
              hidden: { opacity: 0, y: "0.45em" },
              show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
            }}
          >
            {w}
          </motion.span>
        )}
        {i < arr.length - 1 ? " " : ""}
      </span>
    ));
  if (reduce) {
    return (
      <Tag className={base}>
        <span className={leadCls}>{lead}</span> <span className={accentCls}>{accent}</span>
      </Tag>
    );
  }
  const Comp = { h1: motion.h1, h2: motion.h2, h3: motion.h3 }[Tag];
  return (
    <Comp
      className={base}
      initial="hidden"
      {...(trigger === "mount"
        ? { animate: "show" }
        : { whileInView: "show", viewport: { once: true, margin: "-80px" } })}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {words(lead, leadCls)} {words(accent, accentCls)}
    </Comp>
  );
}

/**
 * Bloc d'en-tête de page : chaque enfant direct entre l'un après l'autre au chargement.
 * Les enfants sont des blocs ; leurs marges se confondent à travers l'enveloppe, la mise en page
 * ne change pas.
 */
export function HeroBlock({ children, stagger = 0.08 }: { children: ReactNode; stagger?: number }) {
  const items = Children.toArray(children);
  return (
    <>
      {items.map((child, i) => (
        <Enter key={i} trigger="mount" y={18} delay={0.05 + i * stagger} duration={0.65}>
          {child}
        </Enter>
      ))}
    </>
  );
}

/** Décalage lié au défilement (parallaxe), partagé : un seul écouteur de défilement de page. */
export function Drift({
  children,
  className = "absolute inset-0 pointer-events-none",
  distance = -60,
  range = 900,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  range?: number;
}) {
  const reduce = useReduce();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, range], [0, distance]);
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div data-motion="" aria-hidden="true" className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}

/** Zoom lent d'un fond (photo) pendant que sa section traverse l'écran. */
export function ScrollZoom({
  children,
  className = "absolute inset-0",
  to = 1.08,
}: {
  children: ReactNode;
  className?: string;
  to?: number;
}) {
  const reduce = useReduce();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, to]);
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div data-motion="" ref={ref} className={className} style={{ scale, willChange: "transform" }}>
      {children}
    </motion.div>
  );
}

/** Compteur animé qui démarre quand il devient visible. */
export function Counter({
  value,
  suffix = "",
  duration = 1.2,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

/** Bande défilante infinie (marquee). */
export function Marquee({
  children,
  duration = 32,
}: {
  children: ReactNode;
  duration?: number;
}) {
  return (
    <div className="relative overflow-hidden">
      <div
        className="flex w-max animate-marquee"
        style={{ animationDuration: `${duration}s` }}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
