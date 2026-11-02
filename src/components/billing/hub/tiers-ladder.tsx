import { Buildings, CalendarCheck, Medal, SealPercent } from "@phosphor-icons/react/dist/ssr";
import { formatNumber } from "@/lib/format";
import type { TierWithCount } from "@/lib/repos/billing";
import { cn } from "@/lib/utils";

const TONE: Record<string, { node: string; badge: string; bar: string; soft: string }> = {
  STANDARD: { node: "bg-slate-500", badge: "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300", bar: "bg-slate-400", soft: "bg-slate-50 dark:bg-slate-400/10" },
  SILVER: { node: "bg-zinc-400", badge: "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200", bar: "bg-zinc-400", soft: "bg-zinc-100 dark:bg-zinc-300/10" },
  GOLD: { node: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-900 dark:bg-yellow-200/15 dark:text-yellow-200", bar: "bg-yellow-500", soft: "bg-yellow-50 dark:bg-yellow-200/10" },
};
const toneOf = (code: string) => TONE[code] ?? TONE.STANDARD!;
const since = (months: number) => (months === 0 ? "Dès l'activation" : `${months} mois d'ancienneté`);

export function TiersLadder({ tiers }: { tiers: TierWithCount[] }) {
  const total = tiers.reduce((n, t) => n + t.companies, 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  return (
    <div className="space-y-5">
      {/* Parcours : la progression d'une compagnie dans les paliers */}
      <section aria-label="Parcours des paliers" className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
        <h3 className="text-sm font-semibold">Parcours d&apos;un partenaire</h3>
        <p className="text-xs text-muted-foreground">Le palier augmente avec l&apos;ancienneté, et la remise avec lui.</p>
        <ol className="relative mt-8 flex justify-between" aria-label="Étapes">
          <span aria-hidden className="absolute left-6 right-6 top-6 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-slate-300 via-zinc-300 to-yellow-400" />
          {tiers.map((t) => (
            <li key={t.code} className="relative z-10 flex w-1/3 flex-col items-center text-center first:items-start first:text-left last:items-end last:text-right">
              <span className={cn("flex size-12 items-center justify-center rounded-full text-white shadow-md ring-4 ring-white dark:ring-card", toneOf(t.code).node)}>
                <Medal size={24} weight="fill" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold">{t.code}</p>
              <p className="text-xs text-muted-foreground">{since(t.minMonths)}</p>
              <p className="mt-1 text-xs font-semibold tabular-nums text-accent-text">−{t.discountPercent} %</p>
            </li>
          ))}
        </ol>

        <div className="mt-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Répartition des {formatNumber(total)} compagnies</span>
          </div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-muted" role="img"
            aria-label={tiers.map((t) => `${t.code} ${t.companies}`).join(", ")}>
            {tiers.map((t) => (
              <span key={t.code} className={toneOf(t.code).bar} style={{ width: `${pct(t.companies)}%` }} />
            ))}
          </div>
        </div>
      </section>

      {/* Détail de chaque palier */}
      <ul className="grid gap-5 md:grid-cols-3">
        {tiers.map((t, i) => {
          const tone = toneOf(t.code);
          return (
            <li key={t.code} className="flex flex-col rounded-2xl bg-white p-6 shadow-card dark:bg-card">
              <div className="flex items-center justify-between">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", tone.badge)}>
                  <Medal size={16} weight="fill" aria-hidden /> {t.code}
                </span>
                <span className="text-sm text-muted-foreground">Niveau {i + 1}</span>
              </div>

              <div className={cn("mt-5 rounded-2xl p-5", tone.soft)}>
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><SealPercent size={18} weight="duotone" aria-hidden /> Remise sur l&apos;abonnement</p>
                <p className="mt-1 text-5xl font-extrabold tracking-tight tabular-nums" data-testid={`tier-discount-${t.code}`}>{t.discountPercent} %</p>
              </div>

              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-muted-foreground"><CalendarCheck size={18} weight="duotone" aria-hidden /> Ancienneté</dt>
                  <dd className="font-semibold">{t.minMonths === 0 ? "Dès l'activation" : `${t.minMonths} mois minimum`}</dd>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="inline-flex items-center gap-2 text-muted-foreground"><Buildings size={18} weight="duotone" aria-hidden /> Compagnies</dt>
                    <dd className="font-semibold tabular-nums"><span data-testid={`tier-companies-${t.code}`}>{formatNumber(t.companies)}</span> <span className="font-normal text-muted-foreground">· {pct(t.companies)} %</span></dd>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted"><div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${pct(t.companies)}%` }} /></div>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
