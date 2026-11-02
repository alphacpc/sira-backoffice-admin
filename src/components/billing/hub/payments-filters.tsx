"use client";

import { CalendarBlank, X } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { SelectMenu } from "@/components/ui/select-menu";
import { PAYMENT_CHANNEL_LABEL, PAYMENT_CHANNELS } from "@/lib/repos/billing-hub";
import { cn } from "@/lib/utils";

interface Current { q: string; statut: string; canal: string; du: string; au: string }

const STATUS_OPTIONS = [{ value: "all", label: "Tous" }, { value: "paid", label: "Payés" }, { value: "failed", label: "Échoués" }];
const CHANNEL_OPTIONS = [{ value: "all", label: "Tous" }, ...PAYMENT_CHANNELS.map((c) => ({ value: c, label: PAYMENT_CHANNEL_LABEL[c] }))];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Filters of the payments tab, kept in the URL: status, channel and a date range. */
export function PaymentsFilters({ basePath, current, channels = true, statuses = STATUS_OPTIONS }: {
  basePath: string; current: Current; channels?: boolean; statuses?: { value: string; label: string }[];
}) {
  const router = useRouter();

  function go(next: Partial<Current>) {
    const all = { ...current, ...next };
    const qs = new URLSearchParams();
    if (all.q) qs.set("q", all.q);
    if (all.statut && all.statut !== "all") qs.set("statut", all.statut);
    if (all.canal && all.canal !== "all") qs.set("canal", all.canal);
    if (all.du) qs.set("du", all.du);
    if (all.au) qs.set("au", all.au);
    const text = qs.toString();
    router.push(text ? `${basePath}?${text}` : basePath);
  }

  const today = new Date();
  const presets = [
    { label: "Aujourd'hui", du: iso(today), au: iso(today) },
    { label: "7 jours", du: iso(new Date(today.getTime() - 6 * 86_400_000)), au: iso(today) },
    { label: "30 jours", du: iso(new Date(today.getTime() - 29 * 86_400_000)), au: iso(today) },
  ];
  const hasRange = Boolean(current.du || current.au);
  const dirty = hasRange || current.statut !== "all" || current.canal !== "all";
  const dateCls = "h-10 rounded-xl border border-border bg-card px-3 text-sm shadow-card outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

  return (
    <>
      <SelectMenu label="Statut" value={current.statut || "all"} options={statuses} onChange={(v) => go({ statut: v })} />
      {channels && <SelectMenu label="Canal" value={current.canal || "all"} options={CHANNEL_OPTIONS} onChange={(v) => go({ canal: v })} />}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Période">
        <CalendarBlank size={18} weight="duotone" aria-hidden className="text-muted-foreground" />
        <input type="date" aria-label="Du" value={current.du} max={current.au || undefined} onChange={(e) => go({ du: e.target.value })} className={dateCls} />
        <span className="text-sm text-muted-foreground">au</span>
        <input type="date" aria-label="Au" value={current.au} min={current.du || undefined} onChange={(e) => go({ au: e.target.value })} className={dateCls} />
        <div className="flex gap-1">
          {presets.map((p) => {
            const on = current.du === p.du && current.au === p.au;
            return (
              <button key={p.label} type="button" onClick={() => go({ du: p.du, au: p.au })}
                className={cn("h-10 rounded-xl border px-3 text-sm transition-colors", on ? "border-accent bg-accent-soft font-medium" : "border-border bg-card hover:bg-muted")}>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
      {dirty && (
        <button type="button" onClick={() => go({ statut: "all", canal: "all", du: "", au: "" })} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          <X size={14} aria-hidden /> Réinitialiser
        </button>
      )}
    </>
  );
}
