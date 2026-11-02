import { ArrowRight, Coins, Crown, Medal, Star, Users } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { formatDate, formatNumber } from "@/lib/format";
import { feedbackTypeLabel } from "@/lib/labels";
import type { FeedbackRow, LoyaltyProgramRow } from "@/lib/repos/clients";
import { cn } from "@/lib/utils";
import { Stars } from "./stars";

const CARD = "rounded-2xl bg-white p-6 shadow-card dark:bg-card";

export function ProgramsGrid({ programs, tiers }: { programs: LoyaltyProgramRow[]; tiers: { tier: "REGULAR" | "VIP" | "PREMIUM"; value: number }[] }) {
  const total = tiers.reduce((n, t) => n + t.value, 0) || 1;
  const T = {
    REGULAR: { label: "Regular", icon: Medal, grad: "from-slate-100 to-slate-200 dark:from-slate-400/10 dark:to-slate-400/20", text: "text-slate-700 dark:text-slate-200" },
    VIP: { label: "VIP", icon: Star, grad: "from-zinc-200 to-zinc-300 dark:from-zinc-300/10 dark:to-zinc-300/20", text: "text-zinc-800 dark:text-zinc-100" },
    PREMIUM: { label: "Premium", icon: Crown, grad: "from-yellow-100 to-amber-200 dark:from-yellow-200/10 dark:to-amber-300/20", text: "text-yellow-900 dark:text-yellow-100" },
  } as const;
  return (
    <div className="space-y-5">
      <section aria-label="Paliers des membres" className="grid gap-4 md:grid-cols-3">
        {tiers.map((t) => {
          const c = T[t.tier];
          return (
            <div key={t.tier} className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-6", c.grad)}>
              <c.icon size={72} weight="duotone" aria-hidden className="absolute -bottom-3 -right-2 opacity-20" />
              <p className={cn("flex items-center gap-2 text-sm font-semibold", c.text)}><c.icon size={18} weight="fill" aria-hidden />{c.label}</p>
              <p className="mt-3 text-4xl font-extrabold tabular-nums">{formatNumber(t.value)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{Math.round((t.value / total) * 100)} % des comptes de fidélité</p>
            </div>
          );
        })}
      </section>
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {programs.map((p) => (
          <li key={p.id} className={cn(CARD, "flex flex-col", p.status !== "ACTIVE" && "opacity-75")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="truncate text-lg font-bold">{p.name}</h3><p className="truncate text-sm text-muted-foreground">{p.companyName}</p></div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", p.status === "ACTIVE" ? "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200")}>{p.status === "ACTIVE" ? "Actif" : "Inactif"}</span>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-muted/70 p-4 text-center">
              <div><dd className="text-xl font-bold tabular-nums">{p.pointsPerCurrencyUnit}</dd><dt className="text-[11px] text-muted-foreground">point / FCFA</dt></div>
              <div><dd className="text-xl font-bold tabular-nums">{p.redemptionRate}</dd><dt className="text-[11px] text-muted-foreground">valeur du point</dt></div>
              <div><dd className="text-xl font-bold tabular-nums">{formatNumber(p.minPointsForRedemption)}</dd><dt className="text-[11px] text-muted-foreground">seuil d&apos;échange</dt></div>
            </dl>
            <div className="mt-5 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-muted-foreground"><Users size={16} weight="duotone" aria-hidden />Comptes</span><span className="font-bold tabular-nums">{formatNumber(p.accounts)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-muted-foreground"><Coins size={16} weight="duotone" aria-hidden />Points distribués</span><span className="font-bold tabular-nums">{formatNumber(p.pointsIssued)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS = {
  PENDING: ["En attente", "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300"],
  REVIEWED: ["Examiné", "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300"],
  RESOLVED: ["Résolu", "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300"],
  IGNORED: ["Ignoré", "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200"],
} as const;

/** Rating summary in the style of review platforms: average, stars and distribution. */
export function RatingSummary({ average, total, distribution, ratingHref, current }: {
  average: number | null; total: number; distribution: number[]; ratingHref: (r: number | null) => string; current?: number;
}) {
  const max = Math.max(1, ...distribution);
  return (
    <section aria-label="Notes" className={cn(CARD, "mb-5 grid gap-8 md:grid-cols-[14rem_1fr] md:items-center")}>
      <div className="text-center md:border-r md:border-border md:pr-8">
        <p className="text-6xl font-extrabold tracking-tight tabular-nums">{average === null ? "—" : average.toFixed(1)}</p>
        <div className="mt-2 flex justify-center"><Stars rating={average ?? 0} size={22} /></div>
        <p className="mt-2 text-sm text-muted-foreground">{formatNumber(total)} avis</p>
      </div>
      <ul className="space-y-2">
        {[5, 4, 3, 2, 1].map((r) => {
          const n = distribution[r - 1] ?? 0;
          const on = current === r;
          return (
            <li key={r}>
              <Link href={ratingHref(on ? null : r)} aria-current={on ? "true" : undefined} className={cn("flex items-center gap-3 rounded-lg px-2 py-1 text-sm transition-colors", on ? "bg-accent-soft" : "hover:bg-muted")}>
                <span className="flex w-10 items-center gap-1 font-medium tabular-nums">{r}<Star size={13} weight="fill" aria-hidden className="text-amber-400" /></span>
                <span className="h-2.5 flex-1 rounded-full bg-muted"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${(n / max) * 100}%` }} /></span>
                <span className="w-8 text-right tabular-nums text-muted-foreground">{n}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ReviewsGrid({ reviews }: { reviews: FeedbackRow[] }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {reviews.map((r) => {
        const [label, cls] = STATUS[r.status];
        return (
          <li key={r.id}>
            <Link href={`/clients/avis/${r.id}`} className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-card dark:bg-card">
              <div className="flex items-center justify-between gap-2"><Stars rating={r.rating} /><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", cls)}>{label}</span></div>
              <h3 className="mt-3 text-base font-bold">{r.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{feedbackTypeLabel(r.feedbackType)} · {r.companyName}</p>
              <div className="mt-auto flex items-center justify-between pt-5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.customerName}</span>
                <span className="inline-flex items-center gap-1">{r.responded && <span className="rounded-full bg-lime-100 px-2 py-0.5 font-medium text-lime-800 dark:bg-lime-400/15 dark:text-lime-300">Répondu</span>}{formatDate(r.createdAt)}<ArrowRight size={12} aria-hidden /></span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
