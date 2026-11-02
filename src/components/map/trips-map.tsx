"use client";

import { ArrowRight, Bus, Clock, Path, Pulse, Ruler, X } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Marker, Polyline, Tooltip } from "react-leaflet";
import { formatDateTime, formatMoney } from "@/lib/format";
import { arc } from "@/lib/geo";
import type { Road, TripPath } from "@/lib/repos/fleet-map";
import { cn } from "@/lib/utils";
import { BaseMap, FitView, busIcon, cityIcon } from "./base-map";

const STATUS = {
  planned: { label: "Planifié", color: "#0ea5e9", pill: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300" },
  boarding: { label: "Embarquement", color: "#8b5cf6", pill: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300" },
  departed: { label: "Parti", color: "#65a30d", pill: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300" },
  cancelled: { label: "Annulé", color: "#e11d48", pill: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300" },
} as const;

type LatLng = [number, number];

function km(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Point at `fraction` (0..1) of the length of a polyline. */
function pointAlong(points: LatLng[], fraction: number): LatLng {
  if (points.length < 2) return points[0] ?? [0, 0];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) { const d = km(points[i - 1]!, points[i]!); lengths.push(d); total += d; }
  let target = Math.min(1, Math.max(0, fraction)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]! || i === lengths.length - 1) {
      const t = lengths[i]! === 0 ? 0 : Math.min(1, target / lengths[i]!);
      const a = points[i]!;
      const b = points[i + 1]!;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    target -= lengths[i]!;
  }
  return points.at(-1)!;
}

function hash(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Real progress of a departed trip when it is under way; otherwise a looping simulation (a journey lasts 3 minutes). */
function progressOf(p: TripPath, now: number): { value: number; simulated: boolean } {
  if (p.status === "boarding") return { value: 0, simulated: false };
  const real = (now - Date.parse(p.departure)) / Math.max(1, Date.parse(p.arrival) - Date.parse(p.departure));
  if (real > 0.02 && real < 0.98) return { value: real, simulated: false };
  const period = 180_000;
  return { value: 0.03 + 0.94 * (((now + hash(p.id) * 7919) % period) / period), simulated: true };
}

export function TripsMap({ paths, roads }: { paths: TripPath[]; roads: Record<string, Road> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /** Points of a trip: the real road when known (oriented along the trip), a curve otherwise. */
  const lines = useMemo(() => {
    const m = new Map<string, LatLng[]>();
    for (const p of paths) {
      const road = p.roadKey ? roads[p.roadKey] : undefined;
      m.set(p.id, road ? (p.reversed ? [...road.points].reverse() : road.points) : arc(p.from, p.to));
    }
    return m;
  }, [paths, roads]);

  const selected = paths.find((p) => p.id === selectedId) ?? null;
  const cities = useMemo(() => {
    const m = new Map<string, LatLng>();
    for (const p of paths) { m.set(p.fromCity, p.from); m.set(p.toCity, p.to); }
    return [...m.entries()];
  }, [paths]);
  const bounds = useMemo<LatLng[]>(() => (selected ? lines.get(selected.id) ?? [] : cities.map(([, c]) => c)), [selected, lines, cities]);

  const routes = useMemo(() => {
    const ordered = [...paths].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId));
    return ordered.map((p) => {
      const isSel = p.id === selectedId;
      return (
        <Polyline
          key={p.id} positions={lines.get(p.id) ?? []}
          pathOptions={{ color: STATUS[p.status].color, weight: isSel ? 6 : 3, opacity: selectedId ? (isSel ? 1 : 0.15) : 0.55, dashArray: p.status === "cancelled" ? "4 8" : undefined, className: isSel ? "sira-route-active" : undefined, lineCap: "round", lineJoin: "round" }}
          eventHandlers={{ click: () => setSelectedId(isSel ? null : p.id) }}
        />
      );
    });
  }, [paths, lines, selectedId]);

  const road = selected?.roadKey ? roads[selected.roadKey] : undefined;
  const selProgress = selected && selected.status !== "planned" && selected.status !== "cancelled" ? progressOf(selected, now) : null;
  const moving = paths.filter((p) => p.status === "departed" || p.status === "boarding");

  return (
    <div className="grid h-[calc(100vh-17rem)] min-h-[38rem] overflow-hidden rounded-2xl bg-white shadow-card dark:bg-card lg:grid-cols-[24rem_1fr]">
      <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r" aria-label="Liste des trajets">
        <header className="border-b border-border px-5 py-4">
          <h3 className="font-semibold">{paths.length} trajet{paths.length > 1 ? "s" : ""}</h3>
          <p className="text-xs text-muted-foreground">Clique un trajet pour suivre son parcours sur la route</p>
        </header>
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {paths.map((p) => {
            const on = p.id === selectedId;
            const st = STATUS[p.status];
            const sold = p.totalSeats - p.availableSeats;
            const pct = Math.round((sold / Math.max(1, p.totalSeats)) * 100);
            return (
              <li key={p.id}>
                <button type="button" onClick={() => setSelectedId(on ? null : p.id)} aria-pressed={on} className={cn("w-full px-5 py-3.5 text-left transition-colors", on ? "bg-accent-soft" : "hover:bg-muted/60")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 font-bold"><span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: st.color }} /><span className="truncate">{p.fromCity}</span><ArrowRight size={14} weight="bold" aria-hidden className="shrink-0 text-accent" /><span className="truncate">{p.toCity}</span></span>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", st.pill)}>{st.label}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock size={12} aria-hidden />{formatDateTime(p.departure)} · <Bus size={12} aria-hidden /><span className="tabular-nums">{p.busPlate}</span></p>
                  {on && (
                    <div className="mt-3 space-y-2 text-sm">
                      <p className="text-muted-foreground">{p.companyName}</p>
                      <div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div><span className="text-xs tabular-nums">{sold}/{p.totalSeats}</span></div>
                      <p className="font-semibold tabular-nums">{formatMoney(p.price, p.currency)}</p>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
          {paths.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted-foreground">Aucun trajet pour ces critères.</li>}
        </ul>
      </aside>

      <div className="relative min-h-[26rem]">
        <BaseMap>
          <FitView bounds={bounds} />
          {routes}
          {cities.map(([city, pos]) => (
            <Marker key={city} position={pos} icon={cityIcon(city, !!selected && (selected.fromCity === city || selected.toCity === city))} zIndexOffset={400} />
          ))}
          {moving.map((p) => {
            const pts = lines.get(p.id) ?? [];
            const pos = pointAlong(pts, progressOf(p, now).value);
            return (
              <Marker key={`bus-${p.id}`} position={pos} icon={busIcon(STATUS[p.status].color)} zIndexOffset={p.id === selectedId ? 1000 : 600}
                eventHandlers={{ click: () => setSelectedId(p.id === selectedId ? null : p.id) }}>
                <Tooltip direction="top" offset={[0, -16]} className="sira-tip">{p.busPlate} · {p.fromCity} → {p.toCity}</Tooltip>
              </Marker>
            );
          })}
        </BaseMap>

        <div className="pointer-events-none absolute left-4 top-4 z-[500] space-y-1.5 rounded-xl bg-card/90 px-3 py-2.5 text-xs shadow-card backdrop-blur">
          {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((k) => (
            <p key={k} className="flex items-center gap-2"><span aria-hidden className="h-1 w-5 rounded-full" style={{ background: STATUS[k].color }} />{STATUS[k].label}</p>
          ))}
          <p className="flex items-center gap-2 border-t border-border pt-1.5 text-muted-foreground"><Pulse size={12} aria-hidden />Positions simulées en direct</p>
        </div>

        {selected && (
          <aside className="absolute bottom-4 left-4 right-20 z-[500] max-w-sm rounded-2xl bg-card p-5 shadow-xl" aria-label={`Trajet ${selected.routeLabel}`}>
            <button type="button" onClick={() => setSelectedId(null)} aria-label="Fermer" className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X size={14} aria-hidden /></button>
            <p className="flex items-center gap-2 pr-8 text-lg font-bold">{selected.fromCity}<ArrowRight size={16} weight="bold" aria-hidden className="text-accent" />{selected.toCity}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{selected.companyName} · {selected.busPlate}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-muted/70 p-3"><dt className="text-xs text-muted-foreground">Départ</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatDateTime(selected.departure)}</dd></div>
              <div className="rounded-xl bg-muted/70 p-3"><dt className="text-xs text-muted-foreground">Arrivée</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatDateTime(selected.arrival)}</dd></div>
              {road && (
                <>
                  <div className="rounded-xl bg-muted/70 p-3"><dt className="flex items-center gap-1 text-xs text-muted-foreground"><Ruler size={12} aria-hidden />Distance par la route</dt><dd className="mt-0.5 font-semibold tabular-nums">{road.km} km</dd></div>
                  <div className="rounded-xl bg-muted/70 p-3"><dt className="flex items-center gap-1 text-xs text-muted-foreground"><Path size={12} aria-hidden />Durée estimée</dt><dd className="mt-0.5 font-semibold tabular-nums">{Math.floor(road.minutes / 60)} h {String(road.minutes % 60).padStart(2, "0")}</dd></div>
                </>
              )}
            </dl>
            {selProgress && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground"><span>{selProgress.simulated ? "Progression (simulée)" : "Progression"}</span><span className="tabular-nums">{Math.round(selProgress.value * 100)} %</span></div>
                <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-lime-500 transition-[width] duration-1000 ease-linear" style={{ width: `${selProgress.value * 100}%` }} /></div>
              </div>
            )}
            <Link href={`/flotte/trajets/${selected.id}`} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-foreground hover:opacity-90">Voir le trajet <ArrowRight size={14} aria-hidden /></Link>
          </aside>
        )}
      </div>
    </div>
  );
}
