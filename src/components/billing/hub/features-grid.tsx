import { Check, Gauge, Minus, ToggleRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { FeatureWithPlans } from "@/lib/repos/billing";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

type PlanRef = Pick<Plan, "id" | "name" | "status">;

const GROUPS = [
  { kind: "boolean" as const, title: "Fonctionnalités activables", hint: "Incluses ou non dans un plan", icon: ToggleRight, tone: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300" },
  { kind: "quota" as const, title: "Fonctionnalités à quota", hint: "Consommation limitée par plan", icon: Gauge, tone: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300" },
];

/** Feature × plan comparison: one row per feature, one column per plan, grouped by type. */
export function FeaturesGrid({ features, plans }: { features: FeatureWithPlans[]; plans: PlanRef[] }) {
  const cols = `minmax(15rem,1.6fr) repeat(${Math.max(plans.length, 1)}, minmax(6rem,1fr))`;
  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[44rem] space-y-6">
        {GROUPS.map((g) => {
          const rows = features.filter((f) => f.kind === g.kind);
          if (rows.length === 0) return null;
          return (
            <section key={g.kind} aria-label={g.title} className="overflow-hidden rounded-2xl bg-white shadow-card dark:bg-card">
              <header className="grid items-end gap-x-2 border-b border-border bg-muted/50 px-5 py-4" style={{ gridTemplateColumns: cols }}>
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-10 items-center justify-center rounded-xl", g.tone)}>
                    <g.icon size={22} weight="duotone" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold">{g.title} <span className="font-normal tabular-nums text-muted-foreground">· {rows.length}</span></h3>
                    <p className="text-xs text-muted-foreground">{g.hint}</p>
                  </div>
                </div>
                {plans.map((p) => (
                  <Link key={p.id} href={`/offre/plans/${p.id}`} className={cn("truncate text-center text-sm font-bold hover:underline", p.status === "inactive" && "font-medium text-muted-foreground")}>
                    {p.name}
                    {p.status === "inactive" && <span className="block text-[10px] font-normal uppercase tracking-wide">inactif</span>}
                  </Link>
                ))}
              </header>
              <ul className="divide-y divide-border">
                {rows.map((f) => {
                  const included = new Set(f.plans.map((p) => p.id));
                  return (
                    <li key={f.code} className="grid items-center gap-x-2 px-5 py-4 transition-colors" style={{ gridTemplateColumns: cols }}>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{f.name}</p>
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{f.code}</p>
                      </div>
                      {plans.map((p) => (
                        <div key={p.id} className="flex justify-center">
                          {included.has(p.id) ? (
                            <span aria-label={`Inclus dans ${p.name}`} className="flex size-7 items-center justify-center rounded-full bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300">
                              <Check size={15} weight="bold" aria-hidden />
                            </span>
                          ) : (
                            <span aria-label={`Non inclus dans ${p.name}`} className="flex size-7 items-center justify-center text-muted-foreground/40">
                              <Minus size={15} aria-hidden />
                            </span>
                          )}
                        </div>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
