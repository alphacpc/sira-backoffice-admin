"use client";

import { Check, Desktop, Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Clair", hint: "Fond blanc, idéal en journée", icon: Sun },
  { value: "dark", label: "Sombre", hint: "Moins de fatigue visuelle le soir", icon: Moon },
  { value: "system", label: "Système", hint: "Suit le réglage de ton appareil", icon: Desktop },
] as const;

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? theme ?? "system" : null;
  return (
    <div role="radiogroup" aria-label="Thème de l'interface" className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((o) => {
        const on = current === o.value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => setTheme(o.value)}
            className={cn("relative rounded-2xl border p-4 text-left transition-colors", on ? "border-accent bg-accent-soft/40 ring-2 ring-accent/30" : "border-border hover:bg-muted")}>
            <div className={cn("mb-3 flex h-20 items-end gap-1.5 overflow-hidden rounded-xl p-2", o.value === "dark" ? "bg-zinc-900" : o.value === "light" ? "bg-zinc-100" : "bg-gradient-to-r from-zinc-100 to-zinc-900")}>
              <span className={cn("h-full w-5 rounded", o.value === "light" ? "bg-white" : "bg-zinc-700")} />
              <span className="h-2/3 flex-1 rounded bg-[#ea580c]/80" /><span className="h-1/2 flex-1 rounded bg-sky-400/70" />
            </div>
            <p className="flex items-center gap-2 font-semibold"><o.icon size={18} weight="duotone" aria-hidden />{o.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{o.hint}</p>
            {on && <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-accent text-white"><Check size={14} weight="bold" aria-hidden /></span>}
          </button>
        );
      })}
    </div>
  );
}
