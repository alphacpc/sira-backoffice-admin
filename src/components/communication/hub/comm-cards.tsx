import { CalendarBlank, Clock, Coins, Target, Users } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { CancelScheduleButton } from "@/components/communication/cancel-schedule-button";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { objectiveLabel } from "@/lib/labels";
import type { CampaignRow, MessageRow, ScheduleRow, SegmentRow } from "@/lib/repos/communication";
import { cn } from "@/lib/utils";
import { CHANNEL, ChannelChip } from "./channel";

const CARD = "rounded-2xl bg-white p-6 shadow-card dark:bg-card";
const CAMPAIGN = {
  DRAFT: ["Brouillon", "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200"],
  SCHEDULED: ["Programmée", "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300"],
  RUNNING: ["En cours", "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300"],
  COMPLETED: ["Terminée", "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300"],
  CANCELLED: ["Annulée", "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300"],
} as const;
const MESSAGE = {
  DRAFT: ["Brouillon", "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200"],
  APPROVED: ["Approuvé", "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300"],
  SENT: ["Envoyé", "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300"],
} as const;
const SCHEDULE = {
  PENDING: ["En attente", "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300", "bg-orange-500"],
  SENT: ["Envoyée", "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300", "bg-lime-500"],
  FAILED: ["Échouée", "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300", "bg-rose-500"],
  CANCELLED: ["Annulée", "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200", "bg-zinc-400"],
} as const;

/** `live`: the campaign detail page is not wired to the platform, so cards are not links. */
export function CampaignsGrid({ campaigns, now, live = false }: { campaigns: CampaignRow[]; now: number; live?: boolean }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {campaigns.map((c) => {
        const start = c.startDate ? Date.parse(c.startDate) : NaN;
        const end = c.endDate ? Date.parse(c.endDate) : NaN;
        const hasDates = Number.isFinite(start) && Number.isFinite(end);
        const pct = hasDates ? Math.round(Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start))) * 100) : 0;
        const [label, cls] = CAMPAIGN[c.status];
        return (
          <li key={c.id}>
            <Wrap href={live ? null : `/communication/campagnes/${c.id}`} className={cn(CARD, "flex h-full flex-col")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="truncate text-lg font-bold">{c.name}</h3><p className="truncate text-sm text-muted-foreground">{c.companyName}</p></div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", cls)}>{label}</span>
              </div>
              {c.objective && <p className="mt-4 inline-flex items-center gap-2 text-sm"><Target size={18} weight="duotone" aria-hidden className="text-accent" />{objectiveLabel(c.objective)}</p>}
              {hasDates && (
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-muted-foreground"><span>{formatDate(c.startDate!)}</span><span>{formatDate(c.endDate!)}</span></div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${c.status === "COMPLETED" ? 100 : pct}%` }} /></div>
                </div>
              )}
              <dl className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted/70 p-4 text-center">
                <div><dd className="inline-flex items-center gap-1.5 text-lg font-bold tabular-nums"><Coins size={16} weight="duotone" aria-hidden className="text-muted-foreground" />{c.budget === null ? "—" : formatMoney(c.budget, c.currency)}</dd><dt className="text-[11px] text-muted-foreground">budget</dt></div>
                <div><dd className="text-lg font-bold tabular-nums">{c.scheduleCount}</dd><dt className="text-[11px] text-muted-foreground">programmation(s)</dt></div>
              </dl>
            </Wrap>
          </li>
        );
      })}
    </ul>
  );
}

/** A link, or a plain block when the target page is not available. */
function Wrap({ href, className, children }: { href: string | null; className: string; children: React.ReactNode }) {
  return href ? <Link href={href} className={className}>{children}</Link> : <div className={className}>{children}</div>;
}

/** Messages shown the way the recipient will see them: a bubble under a channel header. */
export function MessagesGrid({ messages, live = false }: { messages: MessageRow[]; live?: boolean }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {messages.map((m) => {
        const [label, cls] = MESSAGE[m.status];
        const ch = CHANNEL[m.channel];
        return (
          <li key={m.id}>
            <Wrap href={live ? null : `/communication/campagnes/${m.campaignId}?onglet=messages`} className={cn(CARD, "flex h-full flex-col")}>
              <div className="flex items-center justify-between gap-2"><ChannelChip channel={m.channel} /><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", cls)}>{label}</span></div>
              <div className="mt-5 flex-1 rounded-2xl rounded-tl-sm bg-muted/70 p-4">
                <p className="font-bold">{m.subject}</p>
                {m.content ? <p className="mt-1.5 line-clamp-4 text-sm text-muted-foreground">{m.content}</p> : live ? <p className="mt-1.5 text-sm italic text-muted-foreground">Le texte du message n&apos;est pas affiché.</p> : null}
              </div>
              <p className="mt-4 truncate text-xs text-muted-foreground"><span className="font-medium text-foreground">{m.campaignName}</span> · {m.companyName}</p>
              <span className="sr-only">{ch.label}</span>
            </Wrap>
          </li>
        );
      })}
    </ul>
  );
}

export function SegmentsGrid({ segments }: { segments: SegmentRow[] }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {segments.map((s) => {
        const estimated = s.estimatedSize ?? 0;
        const max = Math.max(1, estimated, s.eligibleNow);
        return (
          <li key={s.id} className={cn(CARD, "flex flex-col")}>
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300"><Users size={26} weight="duotone" aria-hidden /></span>
              <div className="min-w-0"><h3 className="truncate text-lg font-bold">{s.name}</h3><p className="truncate text-sm text-muted-foreground">{s.companyName}</p></div>
            </div>
            <p className="mt-4 rounded-xl bg-muted/70 px-3 py-2 text-sm"><span className="text-muted-foreground">Ciblage · </span><span className="font-medium">{s.criteriaLabel}</span></p>
            <div className="mt-5 space-y-3 text-sm">
              <div><div className="flex justify-between"><span className="text-muted-foreground">Taille estimée</span><span className="font-bold tabular-nums">{s.estimatedSize === null ? "—" : formatNumber(s.estimatedSize)}</span></div><div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-zinc-400" style={{ width: `${(estimated / max) * 100}%` }} /></div></div>
              <div><div className="flex justify-between"><span className="text-muted-foreground">Éligibles aujourd&apos;hui</span><span className="font-bold tabular-nums">{formatNumber(s.eligibleNow)}</span></div><div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(s.eligibleNow / max) * 100}%` }} /></div></div>
            </div>
            <p className="mt-auto pt-4 text-xs text-muted-foreground">{s.campaignName ? `Campagne : ${s.campaignName}` : "Réutilisable"} · créé le {formatDate(s.createdAt)}</p>
          </li>
        );
      })}
    </ul>
  );
}

const dayLabel = (iso: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(iso));
const time = (iso: string) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso));

/** Scheduled sends as an agenda grouped by day. */
export function ScheduleAgenda({ schedules }: { schedules: ScheduleRow[] }) {
  const groups: { day: string; items: ScheduleRow[] }[] = [];
  for (const s of [...schedules].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))) {
    const day = s.scheduledAt.slice(0, 10);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(s);
    else groups.push({ day, items: [s] });
  }
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.day} aria-label={dayLabel(g.day)}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold capitalize text-muted-foreground"><CalendarBlank size={16} weight="duotone" aria-hidden />{dayLabel(g.day)}</h3>
          <ul className="space-y-2">
            {g.items.map((s) => {
              const [label, cls, dot] = SCHEDULE[s.status];
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-card dark:bg-card">
                  <div className="w-14 text-center"><p className="text-lg font-bold tabular-nums">{time(s.scheduledAt)}</p><span aria-hidden className={cn("mx-auto mt-1 block h-1 w-8 rounded-full", dot)} /></div>
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{s.campaignName}</p><p className="truncate text-xs text-muted-foreground">{s.messageSubject} · {s.segmentName} · {s.companyName}</p></div>
                  {s.channel ? <ChannelChip channel={s.channel} compact /> : <span className="w-7" aria-hidden />}
                  <div className="text-center"><p className="font-bold tabular-nums">{formatNumber(s.recipientsCount)}</p><p className="text-[11px] text-muted-foreground">destinataires</p></div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-medium", cls)}>{label}</span>
                  {s.cancellable ? <CancelScheduleButton scheduleId={s.id} subject={s.messageSubject} /> : <span className="w-20" />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function UpcomingList({ schedules }: { schedules: ScheduleRow[] }) {
  return (
    <ul className="space-y-3">
      {schedules.map((s) => (
        <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
          <Clock size={20} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.campaignName}</p><p className="truncate text-xs text-muted-foreground">{formatDateTime(s.scheduledAt)}</p><p className="truncate text-xs text-muted-foreground">{s.segmentName}</p></div>
          {s.channel && <span title={CHANNEL[s.channel].label} className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", CHANNEL[s.channel].tile)}>{(() => { const I = CHANNEL[s.channel!].icon; return <I size={16} weight="duotone" aria-hidden />; })()}</span>}
        </li>
      ))}
    </ul>
  );
}
