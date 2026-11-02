import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export interface Stat {
  label: string; value: string; hint?: string;
  icon: ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;
}

const TONES = [
  { icon: "bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300" },
  { icon: "bg-sky-100 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300" },
  { icon: "bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300" },
  { icon: "bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300" },
] as const;

/** Summary cards of a tab: white, a tinted icon and a large figure. */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <section aria-label="Aperçu" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s, i) => {
        const tone = TONES[i % TONES.length]!;
        return (
          <div key={s.label} className="rounded-2xl bg-white p-5 shadow-card dark:bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-muted-foreground">{s.label}</p>
                <p className="mt-2 truncate text-3xl font-bold leading-none tracking-tight tabular-nums">{s.value}</p>
                {s.hint && <p className="mt-2 truncate text-xs text-muted-foreground">{s.hint}</p>}
              </div>
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", tone.icon)}>
                <s.icon size={26} weight="duotone" aria-hidden />
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
