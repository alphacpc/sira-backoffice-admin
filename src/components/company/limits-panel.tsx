import { ArrowRight, Bus, CheckCircle, Gear, MinusCircle, Package, Ticket, UsersThree } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType } from "react";
import { StatusBadge } from "@/components/data/status-badge";
import { busStatusBadge } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CompanyDetail } from "@/lib/types";

type IconType = ComponentType<{ size?: number; weight?: "duotone" | "fill"; "aria-hidden"?: boolean; className?: string }>;

const FEATURE_ICON: Record<string, IconType> = { ONLINE_BOOKING: Ticket, FLEET: Bus, PARCELS: Package, HR: UsersThree };

function Quota({ icon: Icon, label, used, max, hint }: { icon: IconType; label: string; used: number; max: number; hint?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const full = pct >= 90;
  return (
    <div>
      <div className="flex items-center gap-3">
        <Icon size={28} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
        <p className="flex-1 text-sm font-semibold">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{used}<span className="text-base font-medium text-muted-foreground"> / {max}</span></p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className={cn("h-full rounded-full", full ? "bg-rose-500" : "bg-orange-500")} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{pct} % utilisé{full ? " · limite presque atteinte" : ""}{hint ? ` · ${hint}` : ""}</p>
    </div>
  );
}

export function LimitsPanel({ detail }: { detail: CompanyDetail }) {
  const limits = detail.limits!;
  const buses = detail.buses;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-6 rounded-card border border-border bg-card p-6 shadow-card">
        <h3 className="text-sm font-semibold">Limites du plan</h3>
        <Quota icon={UsersThree} label="Utilisateurs" used={limits.usedUsers} max={limits.maxUsers} />
        <Quota icon={Bus} label="Bus" used={limits.usedBuses} max={limits.maxBuses} />

        <div className="border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bus de la compagnie ({buses.length})</h4>
            <Link href="/flotte/bus" className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">Tous les bus <ArrowRight size={12} aria-hidden /></Link>
          </div>
          {buses.length === 0 ? <p className="text-sm text-muted-foreground">Aucun bus enregistré.</p> : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {buses.map((b) => {
                const badge = busStatusBadge(b.status);
                return (
                  <li key={b.id}>
                    <Link href={`/flotte/bus/${b.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-muted">
                      <Bus size={22} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
                      <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold">{b.plate}</span>
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-card border border-border bg-card p-6 shadow-card">
        <h3 className="mb-4 text-sm font-semibold">Fonctionnalités</h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {detail.features.map((f) => {
            const Icon = FEATURE_ICON[f.code] ?? Gear;
            return (
              <li key={f.code} className={cn("flex flex-col gap-3 rounded-xl border border-border p-4", !f.enabled && "opacity-60")}>
                <div className="flex items-center justify-between">
                  <Icon size={28} weight="duotone" aria-hidden className={f.enabled ? "text-orange-500" : "text-muted-foreground"} />
                  {f.enabled ? <CheckCircle size={20} weight="fill" aria-hidden className="text-lime-600" /> : <MinusCircle size={20} weight="fill" aria-hidden className="text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{f.enabled ? "Activée" : "Désactivée"}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
