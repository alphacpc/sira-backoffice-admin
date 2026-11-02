import { CalendarCheck, Clock, EnvelopeSimple, MapPin, ShareNetwork, ChartBar, UserCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { ChangeRetention } from "@/components/compliance/change-retention";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDate, formatNumber } from "@/lib/format";
import { companyStatusBadge, consentTypeLabel, dsrStatusBadge, dsrTypeLabel } from "@/lib/labels";
import type { DsrRow, RetentionRow } from "@/lib/repos/compliance";
import type { ConsentCardData } from "@/lib/repos/compliance-hub";
import { cn } from "@/lib/utils";
import { Pill, type Tone } from "./pills";

const CARD = "rounded-2xl bg-white p-5 shadow-card dark:bg-card";
const STATUS_TONE: Record<string, Tone> = { warning: "amber", info: "sky", success: "lime", neutral: "zinc", danger: "rose" };

export function RequestsGrid({ rows }: { rows: DsrRow[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => {
        const b = dsrStatusBadge(r.status);
        const used = r.daysLeft === null ? 100 : Math.min(100, Math.max(4, ((30 - r.daysLeft) / 30) * 100));
        const bar = r.daysLeft === null ? "bg-lime-500" : r.overdue ? "bg-rose-500" : r.daysLeft <= 7 ? "bg-amber-500" : "bg-accent";
        return (
          <li key={r.id}>
            <Link href={`/conformite/demandes-rgpd/${r.id}`} className={cn(CARD, "block")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ea580c] text-sm font-bold text-white">{r.requesterName.slice(0, 2).toUpperCase()}</span>
                  <div className="min-w-0"><p className="truncate font-semibold">{r.requesterName}</p><p className="truncate text-xs text-muted-foreground">{r.companyName}</p></div>
                </div>
                <Pill tone={STATUS_TONE[b.tone] ?? "zinc"}>{b.label}</Pill>
              </div>
              <p className="mt-4 text-lg font-bold">{dsrTypeLabel(r.requestType)}</p>
              <div className="mt-3 h-1.5 rounded-full bg-muted"><div className={cn("h-full rounded-full", bar)} style={{ width: `${used}%` }} /></div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><CalendarCheck size={14} weight="duotone" aria-hidden />Échéance {formatDate(r.dueDate)}</span>
                <span className={cn("font-semibold", r.overdue ? "text-rose-600" : r.daysLeft !== null && r.daysLeft <= 7 ? "text-amber-600" : "")}>
                  {r.daysLeft === null ? "Clôturée" : r.overdue ? `${-r.daysLeft} j de retard` : `${r.daysLeft} j restants`}
                </span>
              </div>
              {r.handledBy && <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground"><UserCircle size={14} weight="duotone" aria-hidden />Traité par {r.handledBy}</p>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const CONSENT_ICON = { MARKETING_EMAIL: EnvelopeSimple, MARKETING_SMS: EnvelopeSimple, DATA_SHARING_PARTNERS: ShareNetwork, COOKIES_ANALYTICS: ChartBar, GEOLOCATION: MapPin } as const;

export function ConsentsGrid({ cards }: { cards: ConsentCardData[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => {
        const Icon = CONSENT_ICON[c.consentType];
        return (
          <li key={c.consentType} className={CARD}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300"><Icon size={24} weight="duotone" aria-hidden /></span>
                <p className="font-semibold">{consentTypeLabel(c.consentType)}</p>
              </div>
              <p className="shrink-0 whitespace-nowrap text-3xl font-extrabold tabular-nums">{c.rate === null ? "—" : `${c.rate} %`}</p>
            </div>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${c.granted} accordés, ${c.withdrawn} retirés`}>
              <div className="bg-lime-500" style={{ width: `${c.rate ?? 0}%` }} />
              <div className="bg-rose-400" style={{ width: `${c.rate === null ? 0 : 100 - c.rate}%` }} />
            </div>
            <p className="mt-2 flex gap-4 text-xs text-muted-foreground"><span><span className="font-semibold text-foreground">{c.granted}</span> accordés</span><span><span className="font-semibold text-foreground">{c.withdrawn}</span> retirés</span></p>
            {c.scopes.length > 1 && (
              <ul className="mt-4 space-y-2 border-t border-border pt-4">
                {c.scopes.slice(0, 4).map((s) => (
                  <li key={s.name} className="flex items-center gap-2 text-sm">
                    <CompanyAvatar name={s.name} size="sm" /><span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{s.granted} / {s.granted + s.withdrawn}</span>
                  </li>
                ))}
                {c.scopes.length > 4 && <li className="text-xs text-muted-foreground">+ {c.scopes.length - 4} autres portées</li>}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function RetentionGrid({ rows }: { rows: RetentionRow[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => {
        const b = companyStatusBadge(r.status);
        const pct = Math.min(100, (r.effectiveDays / 3650) * 100);
        return (
          <li key={r.companyId} className={CARD}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><CompanyAvatar name={r.companyName} /><p className="truncate font-semibold">{r.companyName}</p></div>
              <Pill tone={STATUS_TONE[b.tone] ?? "zinc"}>{b.label}</Pill>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <p className="text-4xl font-extrabold tabular-nums">{r.effectiveDays}<span className="ml-1 text-base font-medium text-muted-foreground">jours</span></p>
              <span className="mb-1 text-xs text-muted-foreground">{r.isCustom ? "Durée personnalisée" : "Durée par défaut"}</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted"><div className={cn("h-full rounded-full", r.isCustom ? "bg-accent" : "bg-zinc-400")} style={{ width: `${Math.max(3, pct)}%` }} /></div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>90 j</span><span>10 ans</span></div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock size={14} weight="duotone" aria-hidden /><span data-testid="retention-pending" className={cn("font-semibold", r.pendingRows > 0 ? "text-amber-600" : "text-foreground")}>{formatNumber(r.pendingRows)}</span> à anonymiser sur {formatNumber(r.olderRows)}</p>
              <ChangeRetention row={r} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
