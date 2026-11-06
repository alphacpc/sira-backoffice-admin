import { Bus, Check, Crown, Gift, Users } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { formatMoney, formatNumber } from "@/lib/format";
import type { PlanCard } from "@/lib/repos/billing-hub";
import { cn } from "@/lib/utils";

function Spec({ icon: Icon, value, label, featured }: { icon: typeof Bus; value: string; label: string; featured: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon size={22} weight="duotone" aria-hidden className={featured ? "text-[#f4a521]" : "text-muted-foreground"} />
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className={cn("text-xs", featured ? "text-white/60" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

/** Plans side by side on one row; the most subscribed one is pushed forward on a dark background. */
export function PlansGrid({ plans }: { plans: PlanCard[] }) {
  const top = Math.max(0, ...plans.map((p) => p.liveSubscriptions));
  return (
    <ul className="grid auto-cols-[minmax(19rem,1fr)] grid-flow-col items-stretch gap-5 overflow-x-auto px-1 pb-4 pt-6">
      {plans.map((p) => {
        const featured = top > 0 && p.liveSubscriptions === top;
        const saving = p.priceMonthly > 0 && p.priceYearly > 0 ? Math.round((1 - p.priceYearly / (p.priceMonthly * 12)) * 100) : 0;
        const inactive = p.status === "inactive";
        return (
          <li key={p.id} className={cn("relative", featured && "-mt-3")}>
            {featured && (
              <span className="absolute -top-3.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#f4a521] px-4 py-1.5 text-sm font-bold text-[#0a2a47] shadow-lg">
                <Crown size={14} weight="fill" aria-hidden /> Le plus souscrit
              </span>
            )}
            <Link
              href={`/offre/plans/${p.id}`}
              className={cn(
                "flex h-full flex-col rounded-3xl p-6",
                featured
                  ? "bg-gradient-to-b from-[#103c63] to-[#0a2a47] text-white shadow-2xl ring-1 ring-white/10"
                  : "border border-border bg-card shadow-card",
                inactive && "opacity-75",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-2xl font-bold">{p.name}</h3>
                  <p className={cn("font-mono text-sm", featured ? "text-white/60" : "text-muted-foreground")}>{p.code}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-sm font-medium",
                    inactive ? "bg-muted text-muted-foreground"
                      : featured ? "bg-white/15 text-white" : "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300",
                  )}
                >
                  {inactive ? "Inactif" : "Actif"}
                </span>
              </div>

              <div className="mt-6">
                <p className="flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-5xl font-extrabold tracking-tight">{formatMoney(p.priceMonthly, p.currency).replace(/\s?F\s?CFA|XOF/i, "")}</span>
                  <span className={cn("text-lg font-semibold", featured ? "text-[#f4a521]" : "text-accent-text")}>FCFA</span>
                  <span className={cn("text-base", featured ? "text-white/60" : "text-muted-foreground")}>/ mois</span>
                </p>
                <p className={cn("mt-2 flex flex-wrap items-center gap-2 text-base", featured ? "text-white/70" : "text-muted-foreground")}>
                  {p.priceYearly > 0 ? <>ou {formatMoney(p.priceYearly, p.currency)} / an</> : <>Pas de tarif annuel</>}
                  {saving > 0 && (
                    <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-semibold", featured ? "bg-[#f4a521]/20 text-[#f4a521]" : "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300")}>
                      −{saving} %
                    </span>
                  )}
                </p>
              </div>

              <div className={cn("mt-6 grid grid-cols-3 gap-2 rounded-2xl p-3.5", featured ? "bg-white/10" : "bg-muted/70")}>
                <Spec icon={Bus} value={p.maxBuses > 0 ? formatNumber(p.maxBuses) : "—"} label="bus max" featured={featured} />
                <Spec icon={Users} value={p.maxUsers > 0 ? formatNumber(p.maxUsers) : "—"} label="utilisateurs" featured={featured} />
                <Spec icon={Gift} value={p.trialDays > 0 ? `${p.trialDays} j` : "—"} label="d'essai" featured={featured} />
              </div>

              <ul className="mt-6 flex-1 space-y-3 text-base">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check size={16} weight="bold" aria-hidden className={cn("shrink-0", featured ? "text-[#f4a521]" : "text-lime-600")} />{f}
                  </li>
                ))}
                {p.features.length === 0 && <li className="text-sm text-muted-foreground">Aucune fonctionnalité incluse</li>}
              </ul>

              <p className={cn("mt-6 border-t pt-4 text-base", featured ? "border-white/15 text-white/70" : "border-border text-muted-foreground")}>
                <span className={cn("font-bold tabular-nums", featured ? "text-white" : "text-foreground")}>{formatNumber(p.liveSubscriptions)}</span> abonnement(s) en cours
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
