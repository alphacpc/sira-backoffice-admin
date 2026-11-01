"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { journeySteps } from "@/content/home";
import { Check, PhoneScreen, Pill } from "@/components/screens/PhoneScreen";

function SearchScreen() {
  return (
    <PhoneScreen
      className="[&_figcaption]:text-white/70"
      label="Recherche"
      title="Choisir un trajet"
      subtitle="Sans compte"
      footer={
        <span className="block rounded-2xl bg-navy py-2.5 text-center text-xs font-bold text-white">
          Rechercher
        </span>
      }
    >
      <div className="space-y-2.5">
        {[
          ["Départ", "Dakar"],
          ["Arrivée", "Touba"],
          ["Date", "Lun 9 juin"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-navy/10 bg-white px-3.5 py-2.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-navy/60">{k}</p>
            <p className="text-sm font-extrabold text-navy">{v}</p>
          </div>
        ))}
        <div className="rounded-xl bg-amber/20 px-3.5 py-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold text-navy/60">DKR → TBA</p>
            <Pill tone="green">Ouvert</Pill>
          </div>
          <p className="mt-1 text-sm font-extrabold text-navy">07:30 · Bus DK-2841-A</p>
        </div>
      </div>
    </PhoneScreen>
  );
}

function PayScreen() {
  return (
    <PhoneScreen
      className="[&_figcaption]:text-white/70"
      label="Paiement"
      title="Dakar → Touba"
      subtitle="Lun 9 juin · 07:30"
      badge={<Pill tone="navy">Simulé</Pill>}
      footer={
        <span className="block rounded-2xl bg-navy py-2.5 text-center text-xs font-bold text-white">
          Payer
        </span>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-navy/10 bg-white px-3.5 py-3">
          <span className="text-xs font-semibold text-navy/70">Sièges</span>
          <span className="font-mono text-sm font-bold text-navy">9A · 9B</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-navy/10 bg-white px-3.5 py-3">
          <span className="text-xs font-semibold text-navy/70">Total</span>
          <span className="text-base font-extrabold text-navy">9 000 FCFA</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#e3f3ea] px-3.5 py-3">
          <Check size={24} />
          <p className="text-xs font-semibold leading-snug text-[#16794d]">
            Paiement de démonstration : la réservation est confirmée.
          </p>
        </div>
      </div>
    </PhoneScreen>
  );
}

function SeatsStage() {
  return (
    <Image
      src="/images/sieges.png"
      alt="Plan des sièges d'un bus Dakar-Touba, deux sièges choisis (9A et 9B)."
      width={820}
      height={1576}
      sizes="280px"
      className="h-auto w-[260px] rounded-[1.75rem] shadow-lift"
    />
  );
}

function TicketStage() {
  return (
    <Image
      src="/images/clean/billet.png"
      alt="Billet électronique Dakar-Touba avec son code QR, siège 12A."
      width={820}
      height={1323}
      sizes="320px"
      className="h-auto w-[300px] self-end rounded-t-[1.75rem]"
      style={{
        WebkitMaskImage: "linear-gradient(to bottom, #000 72%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, #000 72%, transparent 100%)",
      }}
    />
  );
}

const stages: ReactNode[] = [
  <SearchScreen key="s" />,
  <SeatsStage key="p" />,
  <PayScreen key="y" />,
  <TicketStage key="t" />,
];

export default function ParcoursVoyageur() {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const reduce = useReducedMotion();
  const running = !reduce && !userPaused && !hovered && !focused;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setActive((a) => (a + 1) % journeySteps.length), 4500);
    return () => clearInterval(timer);
  }, [running]);

  return (
    <div
      className="grid grid-cols-1 items-center gap-10 [&>*]:min-w-0 lg:grid-cols-[1fr_0.9fr] lg:gap-16"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div>
        <ol>
          {journeySteps.map((step, i) => {
            const on = i === active;
            return (
              <li key={step.title} className="border-t border-white/15 last:border-b">
                <button
                  type="button"
                  onClick={() => {
                    setActive(i);
                    setUserPaused(true);
                  }}
                  aria-current={on ? "step" : undefined}
                  className="group relative flex w-full gap-5 py-5 pl-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                >
                  <span
                    className={`font-mono text-sm font-bold ${on ? "text-amber" : "text-white/60"}`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="block">
                    <span
                      className={`block text-xl font-extrabold leading-tight tracking-tight sm:text-2xl ${
                        on ? "text-white" : "text-white/70 group-hover:text-white"
                      }`}
                    >
                      {step.title}
                      {on ? <span className="sr-only"> (étape en cours)</span> : null}
                    </span>
                    {on ? (
                      <span className="mt-2 block text-sm leading-relaxed text-white/80">{step.text}</span>
                    ) : null}
                  </span>
                  {on ? (
                    <span
                      aria-hidden="true"
                      className="absolute -left-px top-0 h-full w-1 rounded-full bg-amber"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
        {!reduce && (
          <button
            type="button"
            onClick={() => setUserPaused((v) => !v)}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            <span aria-hidden="true">{userPaused ? "▶" : "❚❚"}</span>
            {userPaused ? "Reprendre l'animation" : "Mettre en pause l'animation"}
          </button>
        )}
      </div>

      <div className="relative flex h-[560px] items-center justify-center overflow-hidden rounded-[2rem] bg-navy-dark ring-1 ring-white/10">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-amber/25"
        />
        <div
          aria-hidden="true"
          className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-amber/25"
        />
        <div key={active} className="animate-fade-in relative flex h-full items-center justify-center pt-0">
          <div className={`flex ${active === 3 ? "h-full items-end" : "items-center"}`}>{stages[active]}</div>
        </div>
      </div>
    </div>
  );
}
