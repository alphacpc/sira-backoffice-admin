"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { journeySteps } from "@/content/home";
import { PhoneShell } from "@/components/mockups/Frame";
import {
  TripsScreen,
  SeatsScreen,
  PaymentScreen,
  TicketScreen,
} from "@/components/mockups/JourneyScreens";

const screens = [TripsScreen, SeatsScreen, PaymentScreen, TicketScreen];

export default function Journey() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || paused) return;
    const timer = setInterval(
      () => setActive((a) => (a + 1) % journeySteps.length),
      4500
    );
    return () => clearInterval(timer);
  }, [reduce, paused]);

  const Screen = screens[active];

  return (
    <div
      className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <ol className="space-y-3">
        {journeySteps.map((step, i) => (
          <li key={step.title}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active ? "step" : undefined}
              className={`flex w-full gap-4 rounded-2xl border p-5 text-left transition ${
                i === active
                  ? "border-forest/40 bg-white shadow-soft"
                  : "border-transparent hover:bg-white/60"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  i === active ? "bg-forest text-white" : "bg-ink/10 text-ink/70"
                }`}
              >
                {i + 1}
              </span>
              <span>
                <span className="block font-serif text-lg">{step.title}</span>
                <span className={`mt-1 block text-sm text-ink/70 ${i === active ? "" : "hidden sm:block"}`}>
                  {step.text}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <PhoneShell>
        <div key={active} className="animate-fade-in">
          <Screen />
        </div>
      </PhoneShell>
    </div>
  );
}
