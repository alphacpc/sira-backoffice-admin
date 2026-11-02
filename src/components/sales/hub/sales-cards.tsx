import { ArrowRight, Bank, CreditCard, DeviceMobile, Hourglass, Money, Prohibit, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { paymentLogo } from "@/lib/payment-logos";
import type { OnlineStats, PaymentMethodRow, TicketRow } from "@/lib/repos/sales";
import { cn } from "@/lib/utils";

const TICKET_STATUS = {
  ISSUED: ["Émis", "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300"],
  CHECKED_IN: ["Enregistré", "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300"],
  USED: ["Utilisé", "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300"],
  CANCELLED: ["Annulé", "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300"],
} as const;

/** A QR-like pattern drawn from the ticket code (decorative, not a scannable code). */
function Pattern({ code }: { code: string }) {
  let h = 5381;
  for (const c of code) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  const cells = Array.from({ length: 49 }, (_, i) => ((h >>> (i % 24)) ^ (i * 2654435761)) & 1);
  const corner = (r: number, c: number) => (r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3);
  return (
    <div className="grid size-20 grid-cols-7 gap-[2px] rounded-lg bg-white p-1.5" aria-hidden>
      {cells.map((v, i) => <span key={i} className={cn("rounded-[1px]", corner(Math.floor(i / 7), i % 7) || v ? "bg-[#1c1917]" : "bg-transparent")} />)}
    </div>
  );
}

/** Tickets as boarding passes. */
export function TicketsGrid({ tickets }: { tickets: TicketRow[] }) {
  return (
    <ul className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
      {tickets.map((t) => {
        const [from, to] = t.routeLabel.split(" → ");
        const [label, cls] = TICKET_STATUS[t.status];
        return (
          <li key={t.id}>
            <Link href={`/ventes/billets/${t.ticketCode}`} className="relative flex overflow-hidden rounded-2xl bg-white shadow-card dark:bg-card">
              <div className="min-w-0 flex-1 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.companyName}</p>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", cls)}>{label}</span>
                </div>
                <p className="mt-3 flex items-center gap-2 text-2xl font-extrabold tracking-tight">{from}<ArrowRight size={20} weight="bold" aria-hidden className="text-accent" />{to}</p>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="min-w-0"><dt className="text-xs text-muted-foreground">Voyageur</dt><dd className="truncate font-semibold">{t.passengerName}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Siège</dt><dd className="font-semibold tabular-nums">{t.seatNumber ?? "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Départ</dt><dd className="font-semibold tabular-nums">{t.departure ? formatDateTime(t.departure).slice(0, 10) : "—"}</dd></div>
                </dl>
                <p className="mt-4 font-mono text-xs text-muted-foreground">{t.ticketCode} · {t.scanCount} scan{t.scanCount > 1 ? "s" : ""}</p>
              </div>
              <div aria-hidden className="relative w-0 self-stretch border-l-2 border-dashed border-border">
                <span className="absolute -left-3 -top-3 size-6 rounded-full bg-background" /><span className="absolute -bottom-3 -left-3 size-6 rounded-full bg-background" />
              </div>
              <div className="flex w-32 shrink-0 flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#292524] to-[#1c1917] p-4 text-white">
                <Pattern code={t.ticketCode} />
                <p className="font-mono text-[10px] tracking-widest text-white/70">{t.bookingCode}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const KIND = { MOBILE_MONEY: ["Mobile money", DeviceMobile], CARD: ["Carte bancaire", CreditCard], CASH: ["Espèces", Money] } as const;

function Ring({ percent }: { percent: number | null }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const p = percent ?? 0;
  return (
    <div className="relative size-20 shrink-0" role="img" aria-label={percent === null ? "Aucun paiement" : `${percent} % de réussite`}>
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" strokeLinecap="round" className={p >= 90 ? "stroke-lime-500" : p >= 70 ? "stroke-orange-500" : "stroke-rose-500"} strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">{percent === null ? "—" : `${percent}%`}</span>
    </div>
  );
}

export function MethodsGrid({ methods }: { methods: PaymentMethodRow[] }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {methods.map((m) => {
        const logo = paymentLogo(m.name, m.provider);
        const [kindLabel, KindIcon] = KIND[m.kind];
        return (
          <li key={m.id} className={cn("flex flex-col rounded-2xl bg-white p-6 shadow-card dark:bg-card", !m.active && "opacity-70")}>
            <div className="flex items-start gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted/70 p-2">
                {logo ? <span className="relative block size-full"><Image src={logo} alt="" fill sizes="56px" unoptimized className="object-contain" /></span> : <Bank size={28} weight="duotone" aria-hidden className="text-muted-foreground" />}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-bold">{m.name}</h3>
                <p className="truncate text-sm text-muted-foreground">{m.companyName}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", m.active ? "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200")}>{m.active ? "Actif" : "Inactif"}</span>
            </div>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground"><KindIcon size={18} weight="duotone" aria-hidden />{kindLabel}{m.provider ? ` · ${m.provider}` : ""}</p>
            <div className="mt-4 flex items-center gap-5 rounded-2xl bg-muted/70 p-4">
              <Ring percent={m.successRate} />
              <dl className="grid flex-1 grid-cols-3 gap-2 text-center">
                <div><dd className="text-xl font-bold tabular-nums">{formatNumber(m.transactions)}</dd><dt className="text-[11px] text-muted-foreground">transactions</dt></div>
                <div><dd className="text-xl font-bold tabular-nums text-lime-600">{formatNumber(m.completed)}</dd><dt className="text-[11px] text-muted-foreground">réussies</dt></div>
                <div><dd className={cn("text-xl font-bold tabular-nums", m.failed > 0 && "text-rose-500")}>{formatNumber(m.failed)}</dd><dt className="text-[11px] text-muted-foreground">échouées</dt></div>
              </dl>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const CARD = "rounded-2xl bg-white p-6 shadow-card dark:bg-card";

export function OnlineView({ stats, ttl }: { stats: OnlineStats; ttl: number }) {
  const steps = [
    { label: "Créées", value: stats.total }, { label: "Payées", value: stats.paid },
    { label: "Expirées", value: stats.expired }, { label: "Paiements échoués", value: stats.failedPayments },
  ];
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <section className={cn(CARD, "lg:col-span-2")}>
          <h3 className="font-semibold">Entonnoir du libre-service</h3>
          <p className="text-xs text-muted-foreground">Une réservation non payée expire {ttl} minutes après sa création.</p>
          <ul className="mt-5 space-y-4">
            {steps.map((s, i) => (
              <li key={s.label}>
                <div className="flex items-baseline justify-between text-sm"><span className="font-medium">{s.label}</span><span className="font-bold tabular-nums">{formatNumber(s.value)}</span></div>
                <div className="mt-1.5 h-3 rounded-full bg-muted"><div className={cn("h-full rounded-full", i === 1 ? "bg-lime-500" : i === 0 ? "bg-sky-500" : i === 2 ? "bg-zinc-400" : "bg-rose-500")} style={{ width: `${Math.max(3, (s.value / max) * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
        <section className={cn(CARD, "flex flex-col justify-center text-center")}>
          <p className="text-sm text-muted-foreground">Taux de conversion</p>
          <p className="mt-2 text-6xl font-extrabold tracking-tight tabular-nums" data-testid="online-conversion">{stats.conversionPercent === null ? "—" : `${stats.conversionPercent}%`}</p>
          <p className="mt-2 text-xs text-muted-foreground">Réservations payées / créées</p>
          <p className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-medium text-rose-600"><WarningCircle size={18} weight="duotone" aria-hidden />{formatNumber(stats.stuck)} paiement(s) bloqué(s)</p>
        </section>
      </div>

      <section className={CARD}>
        <h3 className="mb-4 font-semibold">Réservations non payées qui vont expirer</h3>
        {stats.expiring.length === 0 && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Prohibit size={18} weight="duotone" aria-hidden />Aucune réservation en attente de paiement.</p>}
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stats.expiring.map((e) => {
            const left = Math.max(0, e.minutesLeft);
            return (
              <li key={e.id} data-testid="expiring-row">
                <Link href={`/ventes/reservations/${e.id}`} className="block rounded-xl border border-border p-4 hover:bg-muted">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-sm font-bold">{e.bookingCode}</p><p className="truncate text-sm">{e.passengerName}</p><p className="truncate text-xs text-muted-foreground">{e.companyName}</p></div><p className="shrink-0 font-bold tabular-nums">{formatMoney(e.amount, e.currency)}</p></div>
                  <div className="mt-3 flex items-center gap-2 text-xs"><Hourglass size={14} weight="duotone" aria-hidden className={left <= 5 ? "text-rose-500" : "text-orange-500"} /><span className="font-medium">{e.minutesLeft <= 0 ? "Expiration imminente" : `Dans ${e.minutesLeft} min`}</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className={cn("h-full rounded-full", left <= 5 ? "bg-rose-500" : "bg-orange-500")} style={{ width: `${Math.min(100, (left / ttl) * 100)}%` }} /></div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
