import { ArrowRight, CheckCircle, Coins, SealCheck, Star, Truck, Users, Warning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Donut } from "@/components/dashboard/donut";
import { StatTile } from "@/components/dashboard/stat-tile";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { parcelTypeLabel } from "@/lib/labels";
import type { CareOverview } from "@/lib/repos/care-hub";
import { cn } from "@/lib/utils";
import { Stars } from "./stars";

const CARD = "rounded-2xl bg-white p-6 shadow-card dark:bg-card";

function Head({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-semibold">{title}</h3>
      {href && <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">{link ?? "Voir tout"} <ArrowRight size={12} aria-hidden /></Link>}
    </div>
  );
}

export function CareOverviewView({ o }: { o: CareOverview }) {
  const p = o.parcels;
  const stages = [
    { label: "Enregistrés", value: p.byStatus.PENDING, tone: "bg-slate-400" },
    { label: "En transit", value: p.byStatus.IN_TRANSIT, tone: "bg-accent" },
    { label: "Au hub", value: p.byStatus.AT_HUB, tone: "bg-violet-500" },
    { label: "Livrés", value: p.byStatus.DELIVERED, tone: "bg-lime-500" },
  ];
  const stageMax = Math.max(1, ...stages.map((s) => s.value));
  const exceptions = p.byStatus.CANCELLED + p.byStatus.RETURNED + p.byStatus.LOST;
  const maxDist = Math.max(1, ...o.reviews.distribution);
  return (
    <div className="space-y-5">
      <section aria-label="Indicateurs" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Colis en circulation" value={formatNumber(p.byStatus.IN_TRANSIT + p.byStatus.AT_HUB)} hint={`${formatNumber(p.total)} colis au total`} icon={Truck} tone="info" />
        <StatTile label="Taux de livraison" value={p.deliveryRate === null ? "—" : `${p.deliveryRate} %`} hint={p.avgHours === null ? "colis clos" : `en moyenne ${p.avgHours} h`} icon={SealCheck} tone="success" />
        <StatTile label="Clients inscrits" value={formatNumber(o.customers.total)} hint={`${o.customers.fresh} nouveaux en 30 j`} icon={Users} tone="accent" />
        <StatTile label="Note moyenne" value={o.reviews.average === null ? "—" : `${o.reviews.average.toFixed(1)} / 5`} hint={`${o.reviews.total} avis · ${o.reviews.pending} en attente`} icon={Star} tone="info" />
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className={`${CARD} xl:col-span-2`} aria-label="Flux des colis">
          <Head title="Flux des colis" href="/colis-clients/colis" link="Tous les colis" />
          <div className="grid grid-cols-4 gap-3">
            {stages.map((s, i) => (
              <div key={s.label} className="relative">
                <div className="flex h-36 items-end rounded-2xl bg-muted/60 p-2"><div className={cn("w-full rounded-xl", s.tone)} style={{ height: `${Math.max(8, (s.value / stageMax) * 100)}%` }} /></div>
                <p className="mt-2 text-2xl font-extrabold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                {i < stages.length - 1 && <ArrowRight size={14} aria-hidden className="absolute -right-3.5 top-1/2 hidden text-muted-foreground/60 sm:block" />}
              </div>
            ))}
          </div>
          <p className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>Exceptions : <span className="font-semibold text-foreground">{exceptions}</span></span>
            <span>Retournés : <span className="font-semibold text-foreground">{p.byStatus.RETURNED}</span></span>
            <span>Perdus : <span className={cn("font-semibold", p.byStatus.LOST > 0 ? "text-rose-600" : "text-foreground")}>{p.byStatus.LOST}</span></span>
            <span className="inline-flex items-center gap-1"><Coins size={14} weight="duotone" aria-hidden />Frais encaissés : <span className="font-semibold text-foreground">{formatMoney(p.revenue, "XOF")}</span></span>
          </p>
        </section>

        <section className={CARD} aria-label="Colis en retard">
          <Head title="Colis en retard" href="/colis-clients/colis" />
          {p.late.length === 0 && <p className="flex items-center gap-2 text-sm text-lime-600"><CheckCircle size={18} weight="duotone" aria-hidden />Aucun colis en retard.</p>}
          <ul className="space-y-2.5">
            {p.late.map((l) => (
              <li key={l.id}>
                <Link href={`/colis/${l.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted">
                  <Warning size={20} weight="fill" aria-hidden className="shrink-0 text-rose-500" />
                  <div className="min-w-0 flex-1"><p className="truncate font-mono text-sm font-bold">{l.parcelCode}</p><p className="truncate text-xs text-muted-foreground">{l.routeLabel} · {l.companyName}</p></div>
                  <span className="shrink-0 text-xs tabular-nums text-rose-600">{formatDate(l.expectedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {p.lateCount > p.late.length && <p className="mt-3 text-xs text-muted-foreground">+ {p.lateCount - p.late.length} autre(s)</p>}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className={CARD} aria-label="Types de colis">
          <Head title="Ce qu'on transporte" />
          <Donut data={p.byType.map((t, i) => ({ label: parcelTypeLabel(t.type), value: t.value, tone: (["accent", "info", "success", "warning", "neutral"] as const)[i % 5] }))} centerLabel="colis" />
        </section>
        <section className={CARD} aria-label="Fidélité">
          <Head title="Paliers de fidélité" href="/colis-clients/fidelite" link="Programmes" />
          <Donut data={o.customers.tiers.map((t, i) => ({ label: t.tier === "PREMIUM" ? "Premium" : t.tier === "VIP" ? "VIP" : "Regular", value: t.value, tone: (["neutral", "info", "warning"] as const)[i] }))} centerLabel="comptes" />
          <p className="mt-4 text-xs text-muted-foreground">Points moyens par client : <span className="font-semibold text-foreground">{formatNumber(o.customers.avgPoints)}</span> · Entreprises : <span className="font-semibold text-foreground">{o.customers.corporate}</span></p>
        </section>
        <section className={CARD} aria-label="Meilleurs clients">
          <Head title="Meilleurs clients" href="/colis-clients/comptes" link="Clients" />
          <ol className="space-y-3">
            {o.customers.top.map((c, i) => (
              <li key={c.id}>
                <Link href={`/clients/comptes/${c.id}`} className="flex items-center gap-3 hover:underline">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums">{formatNumber(c.totalPoints)} <span className="text-xs font-normal text-muted-foreground">pts</span></span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className={CARD} aria-label="Avis">
        <Head title="Voix des clients" href="/colis-clients/avis" link="Tous les avis" />
        <div className="grid gap-8 md:grid-cols-[14rem_1fr_1.4fr] md:items-center">
          <div className="text-center"><p className="text-5xl font-extrabold tabular-nums">{o.reviews.average === null ? "—" : o.reviews.average.toFixed(1)}</p><div className="mt-2 flex justify-center"><Stars rating={o.reviews.average ?? 0} size={20} /></div><p className="mt-1 text-xs text-muted-foreground">{o.reviews.total} avis</p></div>
          <ul className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((r) => (
              <li key={r} className="flex items-center gap-2 text-xs"><span className="w-4 tabular-nums">{r}</span><Star size={11} weight="fill" aria-hidden className="text-amber-400" /><span className="h-2 flex-1 rounded-full bg-muted"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${((o.reviews.distribution[r - 1] ?? 0) / maxDist) * 100}%` }} /></span><span className="w-5 text-right tabular-nums text-muted-foreground">{o.reviews.distribution[r - 1]}</span></li>
            ))}
          </ul>
          <ul className="space-y-2">
            {o.reviews.recent.map((r) => (
              <li key={r.id}><Link href={`/clients/avis/${r.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted"><Stars rating={r.rating} size={14} /><span className="min-w-0 flex-1 truncate text-sm font-medium">{r.title}</span><span className="shrink-0 text-xs text-muted-foreground">{r.customerName}</span></Link></li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
