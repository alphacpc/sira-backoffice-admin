import { Clock, HandCoins, Prohibit, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { formatMoney, formatNumber } from "@/lib/format";
import type { UnpaidOwnerRow, Urgency } from "@/lib/repos/billing-hub";

const BUCKETS: { key: Urgency; label: string; hint: string; dot: string }[] = [
  { key: "critical", label: "Critique", hint: "2 jours ou moins", dot: "bg-rose-500" },
  { key: "soon", label: "Bientôt", hint: "3 à 5 jours", dot: "bg-orange-500" },
  { key: "normal", label: "À surveiller", hint: "plus de 5 jours", dot: "bg-amber-400" },
];

/** Recovery summary: total at risk, how it splits by urgency, and the most urgent file. */
export function RecoveryOverview({ rows }: { rows: UnpaidOwnerRow[] }) {
  const currency = rows[0]?.currency ?? "XOF";
  const sum = (l: UnpaidOwnerRow[]) => l.reduce((n, r) => n + r.price, 0);
  const total = sum(rows);
  const pastDue = rows.filter((r) => r.status === "past_due");
  const suspended = rows.filter((r) => r.status === "suspended");
  const urgent = [...rows].sort((a, b) => a.daysLeft - b.daysLeft)[0];
  const share = (k: Urgency) => (total ? (sum(rows.filter((r) => r.urgency === k)) / total) * 100 : 0);

  return (
    <section aria-label="Recouvrement" className="mb-5 grid gap-px overflow-hidden rounded-2xl bg-border shadow-card lg:grid-cols-[1.3fr_1fr_1fr]">
      <div className="bg-white p-6 dark:bg-card">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><HandCoins size={18} weight="duotone" aria-hidden className="text-accent" /> À recouvrer</p>
        <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">{formatMoney(total, currency)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{formatNumber(rows.length)} abonnement(s) en retard de paiement</p>
        <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label="Répartition par urgence">
          {BUCKETS.map((b) => <span key={b.key} className={b.dot} style={{ width: `${share(b.key)}%` }} />)}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {BUCKETS.map((b) => (
            <li key={b.key} className="flex items-center gap-1.5">
              <span aria-hidden className={`size-2 rounded-full ${b.dot}`} />
              <span className="font-semibold tabular-nums text-foreground">{rows.filter((r) => r.urgency === b.key).length}</span> {b.label}
              <span className="hidden sm:inline">· {b.hint}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-5 bg-white p-6 dark:bg-card">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><WarningCircle size={18} weight="duotone" aria-hidden className="text-orange-500" /> Impayés</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{pastDue.length}</p>
          <p className="text-xs text-muted-foreground">{formatMoney(sum(pastDue), currency)} · suspension après 7 jours</p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Prohibit size={18} weight="duotone" aria-hidden className="text-rose-500" /> Suspendus</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{suspended.length}</p>
          <p className="text-xs text-muted-foreground">{formatMoney(sum(suspended), currency)} · expiration après 30 jours</p>
        </div>
      </div>

      <div className="bg-white p-6 dark:bg-card">
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock size={18} weight="duotone" aria-hidden className="text-violet-500" /> Le plus urgent</p>
        {urgent ? (
          <>
            <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">{urgent.daysLeft} <span className="text-lg font-semibold text-muted-foreground">jour{Math.abs(urgent.daysLeft) > 1 ? "s" : ""}</span></p>
            <p className="mt-1 font-semibold">{urgent.companyName}</p>
            <p className="text-xs text-muted-foreground">avant {urgent.deadline === "suspension" ? "la suspension" : "l'expiration"} · {formatMoney(urgent.price, urgent.currency)}</p>
          </>
        ) : <p className="mt-3 text-sm text-muted-foreground">Rien à recouvrer.</p>}
      </div>
    </section>
  );
}
