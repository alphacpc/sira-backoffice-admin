import { ArrowRight, CheckCircle, Megaphone, PaperPlaneTilt, Target, Warning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Donut } from "@/components/dashboard/donut";
import { StatTile } from "@/components/dashboard/stat-tile";
import { formatNumber } from "@/lib/format";
import type { CommOverview } from "@/lib/repos/communication-hub";
import { cn } from "@/lib/utils";
import { CHANNEL } from "./channel";
import { UpcomingList } from "./comm-cards";

const CARD = "rounded-2xl bg-white p-6 shadow-card dark:bg-card";
const STEP = { DRAFT: ["Brouillons", "bg-zinc-400"], SCHEDULED: ["Programmées", "bg-sky-500"], RUNNING: ["En cours", "bg-violet-500"], COMPLETED: ["Terminées", "bg-lime-500"], CANCELLED: ["Annulées", "bg-rose-500"] } as const;

function Head({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-semibold">{title}</h3>
      {href && <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">{link ?? "Voir tout"} <ArrowRight size={12} aria-hidden /></Link>}
    </div>
  );
}

export function CommOverviewView({ o }: { o: CommOverview }) {
  const n = o.notifications;
  const total = n.sent + n.failed + n.pending;
  const maxPipe = Math.max(1, ...o.pipeline.map((p) => p.value));
  const tones = ["accent", "info", "success", "warning", "danger"] as const;
  return (
    <div className="space-y-5">
      <section aria-label="Indicateurs" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Notifications" value={formatNumber(total)} hint={`${formatNumber(n.sent)} envoyées`} icon={PaperPlaneTilt} tone="info" />
        <StatTile label="Taux de livraison" value={n.successRate === null ? "—" : `${n.successRate} %`} hint={`${n.failed} échec(s)`} icon={CheckCircle} tone="success" />
        <StatTile label="Campagnes" value={formatNumber(o.campaigns)} hint={`${o.pipeline.find((p) => p.status === "RUNNING")?.value ?? 0} en cours`} icon={Megaphone} tone="accent" />
        <StatTile label="Audience éligible" value={formatNumber(o.audience)} hint="destinataires aujourd'hui" icon={Target} tone="info" />
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className={cn(CARD, "xl:col-span-2")} aria-label="Pipeline des campagnes">
          <Head title="Pipeline des campagnes" href="/communication/campagnes" link="Campagnes" />
          <div className="grid grid-cols-5 gap-3 xl:py-2">
            {o.pipeline.map((p) => (
              <div key={p.status}>
                <div className="flex h-24 items-end rounded-2xl bg-muted/60 p-2"><div className={cn("w-full rounded-xl", STEP[p.status][1])} style={{ height: `${Math.max(8, (p.value / maxPipe) * 100)}%` }} /></div>
                <p className="mt-2 text-2xl font-extrabold tabular-nums">{p.value}</p>
                <p className="text-xs text-muted-foreground">{STEP[p.status][0]}</p>
              </div>
            ))}
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-5">
            <div><dt className="text-xs text-muted-foreground">Envoyées</dt><dd className="mt-1 text-xl font-extrabold tabular-nums">{formatNumber(n.sent)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">En attente</dt><dd className="mt-1 text-xl font-extrabold tabular-nums">{formatNumber(n.pending)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Échouées</dt><dd className="mt-1 text-xl font-extrabold tabular-nums text-rose-600">{formatNumber(n.failed)}</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {n.byChannel.map((c) => <span key={c.channel} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium"><span className="size-1.5 rounded-full bg-accent" />{CHANNEL[c.channel].label} · {formatNumber(c.value)}</span>)}
          </div>
        </section>
        <section className={CARD} aria-label="Prochains envois">
          <Head title="Prochains envois" href="/communication/programmations" link="Programmations" />
          {o.upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Aucun envoi en attente.</p> : <UpcomingList schedules={o.upcoming} />}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className={CARD} aria-label="Canaux">
          <Head title="Canaux utilisés" />
          <Donut data={n.byChannel.map((c, i) => ({ label: CHANNEL[c.channel].label, value: c.value, tone: tones[i % tones.length] }))} centerLabel="messages" />
        </section>
        <section className={CARD} aria-label="Campagnes qui touchent le plus">
          <Head title="Campagnes les plus diffusées" />
          {o.topCampaigns.length === 0 && <p className="text-sm text-muted-foreground">Aucun envoi terminé.</p>}
          <ol className="space-y-4">
            {o.topCampaigns.map((c, i) => (
              <li key={c.id}>
                <Link href={`/communication/campagnes/${c.id}`} className="block">
                  <div className="flex items-baseline justify-between gap-2 text-sm"><span className="truncate font-medium"><span className="mr-2 text-muted-foreground">{i + 1}</span>{c.name}</span><span className="shrink-0 tabular-nums text-muted-foreground">{formatNumber(c.recipients)} dest.</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(6, (c.recipients / Math.max(1, o.topCampaigns[0]!.recipients)) * 100)}%` }} /></div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
        <section className={CARD} aria-label="Échecs récents">
          <Head title="Échecs récents" href="/communication/notifications?statut=FAILED" />
          {n.failures.length === 0 && <p className="flex items-center gap-2 text-sm text-lime-600"><CheckCircle size={18} weight="duotone" aria-hidden />Aucun échec d&apos;envoi.</p>}
          <ul className="space-y-2.5">
            {n.failures.map((f) => (
              <li key={f.id}><Link href={`/communication/notifications/${f.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted"><Warning size={20} weight="fill" aria-hidden className="shrink-0 text-rose-500" /><div className="min-w-0 flex-1"><p className="truncate font-mono text-sm font-bold">{f.notificationCode}</p><p className="truncate text-xs text-muted-foreground">{f.recipientLabel} · {CHANNEL[f.channel].label}</p></div></Link></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
