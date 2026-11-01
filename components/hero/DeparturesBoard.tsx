"use client";

import { motion } from "motion/react";
import { EASE, useReduce } from "@/components/motion";

export type BoardRow = { n: string; code: string; name: string; tagline: string; href: string; note?: string };

/** Début du battement (s) : après le titre, en même temps que les photos. */
const START = 0.5;
const ROW_STEP = 0.08;
const CHAR_STEP = 0.02;
const FLIP = 0.4;

/**
 * Cellule « split-flap » : chaque caractère bascule une seule fois (rotateX 90° → 0), puis reste fixe.
 * Le vrai texte reste dans le DOM pour les lecteurs d'écran ; la copie animée est masquée (aria-hidden).
 */
function Flap({ text, row, className = "" }: { text: string; row: number; className?: string }) {
  const reduce = useReduce();
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={`inline-flex [perspective:420px] ${className}`}>
        {text.split("").map((ch, i) =>
          reduce ? (
            <span key={i} className="inline-block whitespace-pre">{ch}</span>
          ) : (
            <motion.span
              key={i}
              data-motion=""
              className="inline-block whitespace-pre [backface-visibility:hidden]"
              style={{ transformOrigin: "50% 60%" }}
              initial={{ rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ duration: FLIP, delay: START + row * ROW_STEP + i * CHAR_STEP, ease: EASE }}
            >
              {ch}
            </motion.span>
          ),
        )}
      </span>
    </>
  );
}

/** Perforation : demi-cercles découpés (masque, donc réellement transparents) à la hauteur du trait pointillé. */
const NOTCH_Y = "2.75rem";
const perforation = {
  WebkitMaskImage: `radial-gradient(circle at 0 ${NOTCH_Y}, transparent 9px, #000 9.5px), radial-gradient(circle at 100% ${NOTCH_Y}, transparent 9px, #000 9.5px)`,
  WebkitMaskSize: "51% 100%, 51% 100%",
  WebkitMaskPosition: "left top, right top",
  WebkitMaskRepeat: "no-repeat",
  maskImage: `radial-gradient(circle at 0 ${NOTCH_Y}, transparent 9px, #000 9.5px), radial-gradient(circle at 100% ${NOTCH_Y}, transparent 9px, #000 9.5px)`,
  maskSize: "51% 100%, 51% 100%",
  maskPosition: "left top, right top",
  maskRepeat: "no-repeat",
} as const;

const GRID =
  "grid grid-cols-[1.75rem_3rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 lg:grid-cols-[2rem_4rem_10rem_minmax(0,1fr)_8.5rem_1.5rem] lg:gap-x-5 lg:gap-y-0";

export function DeparturesBoard({ rows }: { rows: BoardRow[] }) {
  return (
    <div className="relative [filter:drop-shadow(0_18px_28px_rgba(30,39,73,0.16))]">
      <p
        aria-hidden="true"
        className="absolute -top-3 left-6 z-10 rounded-sm bg-amber px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-navy"
      >
        Départs
      </p>
      <div className="border border-ink/20 bg-white text-navy [border-radius:1rem]" style={perforation}>
        {/* En-tête : numéro / code / destination / ce que ça couvre / statut */}
        <div
          aria-hidden="true"
          className={`${GRID} h-[2.75rem] border-b-2 border-dashed border-ink/20 px-5 pt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70 lg:px-8`}
        >
          <span>N°</span>
          <span>Code</span>
          <span className="col-span-2 lg:col-span-1">Destination</span>
          <span className="hidden lg:block">Ce que ça couvre</span>
          <span className="hidden text-right lg:block">Statut</span>
          <span className="hidden lg:block" />
        </div>
        <ul aria-label="Les cinq chapitres de Sira" className="px-2 pb-2 pt-1 lg:px-3">
          {rows.map((r, i) => (
            <li key={r.code} className="border-t border-dashed border-ink/20 first:border-t-0">
              <a
                href={r.href}
                className={`${GRID} group rounded-lg px-3 py-3 font-mono tabular-nums transition-colors duration-200 hover:bg-amber-soft/70 focus-visible:bg-amber-soft/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy lg:px-5 lg:py-3`}
              >
                <span className="text-xs text-ink/70">{r.n}</span>
                <span className="text-base font-bold tracking-[0.12em] text-amber-ink">
                  <Flap text={r.code} row={i} />
                </span>
                <span className="text-[13px] font-semibold uppercase tracking-[0.05em] text-navy lg:text-sm lg:tracking-[0.14em]">
                  <Flap text={r.name} row={i} />
                </span>
                <span className="col-start-3 col-end-5 row-start-2 truncate font-sans text-[13px] leading-snug text-ink/75 [text-wrap:balance] max-lg:whitespace-normal lg:col-auto lg:row-auto lg:pr-4 lg:text-sm" title={r.tagline}>
                  {r.tagline}
                </span>
                <span className="max-lg:contents lg:flex lg:flex-row-reverse lg:items-center lg:justify-start lg:gap-3">
                  <span className="inline-flex items-center gap-1.5 justify-self-end rounded-full border border-ink/20 bg-white px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] lg:gap-2 lg:px-2.5 lg:text-[10px] lg:tracking-[0.16em] text-navy max-lg:col-start-4 max-lg:row-start-1">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber" />
                    Disponible
                  </span>
                </span>
                <span aria-hidden="true" data-arrow className="hidden text-amber-ink transition-transform duration-200 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none lg:block">
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
