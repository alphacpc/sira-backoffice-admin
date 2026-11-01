"use client";

import { motion } from "motion/react";
import { EASE, useReduce } from "@/components/motion";
import { RequestStatusChips } from "./RequestStatusChips";

const lines = [
  { label: "Location autocar 54 places · 2 jours", amount: "•••• FCFA" },
  { label: "Chauffeur", amount: "•••• FCFA" },
  { label: "Frais de route", amount: "•••• FCFA" },
] as const;

/**
 * Quote sheet: white paper with a perforated top edge, navy « DEVIS » band, masked amounts (no real
 * prices). Entrance: the paper slides in from above and settles, once; static under reduced motion.
 */
export function QuoteDocument({ className = "", settle = true }: { className?: string; settle?: boolean }) {
  const reduce = useReduce();
  const animated = settle && !reduce;
  return (
    <figure className={`mx-auto w-full max-w-[340px] ${className}`}>
      <motion.div
        data-motion=""
        initial={animated ? { opacity: 0, y: -28, rotate: -2.5 } : false}
        whileInView={animated ? { opacity: 1, y: 0, rotate: 0 } : undefined}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.85, ease: EASE, delay: 0.2 }}
        className="relative overflow-hidden rounded-b-2xl bg-white shadow-lift"
      >
        {/* Perforated top edge: half-discs bite into the sheet. */}
        <span
          aria-hidden="true"
          className="block h-3 w-full"
          style={{
            backgroundImage: "radial-gradient(circle at 8px 0, #f1f2f6 6px, transparent 6.5px)",
            backgroundSize: "16px 100%",
            backgroundColor: "#fff",
          }}
        />
        <div className="bg-navy px-5 pb-4 pt-3.5 text-white">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber">N° DEV-EXEMPLE</p>
            <span className="inline-flex rounded-full bg-[#e3f3ea] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#16794d]">
              Prêt à partager
            </span>
          </div>
          <p className="mt-1.5 text-[26px] font-extrabold leading-none tracking-[0.06em]">DEVIS</p>
          <p className="mt-1.5 text-xs font-semibold text-white/70">Transports Exemple</p>
        </div>

        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-navy/60">Client</p>
          <p className="text-sm font-extrabold text-navy">Association Exemple · 48 passagers</p>
          <p className="mt-0.5 text-[11px] font-semibold text-navy/60">Dakar → Touba · aller-retour</p>

          <div aria-hidden="true" className="my-3 border-t-2 border-dashed border-navy/15" />

          <div className="flex items-center justify-between font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-navy/50">
            <span>Désignation</span>
            <span>Montant</span>
          </div>
          <ul>
            {lines.map((l) => (
              <li key={l.label} className="flex items-baseline justify-between gap-3 border-t border-navy/10 py-2 first:mt-1.5">
                <span className="text-xs font-semibold text-navy">{l.label}</span>
                <span className="shrink-0 font-mono text-xs font-bold text-navy/55">{l.amount}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between gap-3 border-t-2 border-navy pt-2.5">
            <span className="text-sm font-extrabold text-navy">Total</span>
            <span className="font-mono text-lg font-extrabold text-navy">•••••• FCFA</span>
          </div>
        </div>

        <div className="space-y-3 border-t border-navy/10 bg-[#fcfaf5] px-5 py-3.5">
          <RequestStatusChips />
          <div className="flex items-center gap-2">
            <span className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-dashed border-navy/25 bg-white px-3 py-2.5 font-mono text-[11px] font-semibold text-navy/60">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-ink">
                <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
              </svg>
              <span className="truncate">lien · DEV-EXEMPLE</span>
            </span>
            <span className="shrink-0 rounded-2xl bg-navy px-4 py-2.5 text-xs font-bold text-white">Partager le lien</span>
          </div>
        </div>
      </motion.div>
      <figcaption className="mt-3 text-center font-mono text-[11px] text-ink/70">Aperçu illustratif</figcaption>
    </figure>
  );
}
