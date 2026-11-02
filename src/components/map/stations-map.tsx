"use client";

import { ArrowRight, Buildings, MapPin, Path, X } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Marker, Tooltip } from "react-leaflet";
import type { StationPin } from "@/lib/repos/fleet-map";
import { cn } from "@/lib/utils";
import { BaseMap, FitView, stationIcon } from "./base-map";

export function StationsMap({ stations }: { stations: StationPin[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = stations.find((s) => s.id === selectedId) ?? null;
  const cities = useMemo(() => new Set(stations.map((s) => s.city)).size, [stations]);
  const bounds = useMemo<[number, number][]>(
    () => (selected ? [[selected.lat, selected.lng]] : stations.map((s) => [s.lat, s.lng] as [number, number])),
    [selected, stations],
  );

  return (
    <div className="grid h-[calc(100vh-17rem)] min-h-[38rem] overflow-hidden rounded-2xl bg-white shadow-card dark:bg-card lg:grid-cols-[22rem_1fr]">
      <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r" aria-label="Liste des gares">
        <header className="border-b border-border px-5 py-4">
          <h3 className="font-semibold">{stations.length} gare{stations.length > 1 ? "s" : ""}</h3>
          <p className="text-xs text-muted-foreground">{cities} ville{cities > 1 ? "s" : ""} · clique une gare pour la situer</p>
        </header>
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {stations.map((s) => {
            const on = s.id === selectedId;
            return (
              <li key={s.id}>
                <button type="button" onClick={() => setSelectedId(on ? null : s.id)} aria-pressed={on}
                  className={cn("flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors", on ? "bg-accent-soft" : "hover:bg-muted/60")}>
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", on ? "bg-[#0a2a47] text-white" : "bg-orange-50 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300")}>
                    <MapPin size={22} weight="duotone" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{s.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.city} · {s.companyName}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums" title="Lignes desservies">{s.routeCount}</span>
                </button>
              </li>
            );
          })}
          {stations.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted-foreground">Aucune gare pour ces critères.</li>}
        </ul>
      </aside>

      <div className="relative min-h-[26rem]">
        <BaseMap>
          <FitView bounds={bounds} />
          {stations.map((s) => (
            <Marker
              key={s.id} position={[s.lat, s.lng]} icon={stationIcon({ lines: s.routeCount, selected: s.id === selectedId, dim: !!selectedId && s.id !== selectedId })}
              eventHandlers={{ click: () => setSelectedId(s.id === selectedId ? null : s.id) }} zIndexOffset={s.id === selectedId ? 1000 : 0}
            >
              <Tooltip direction="top" offset={[0, -46]} className="sira-tip">{s.name}</Tooltip>
            </Marker>
          ))}
        </BaseMap>

        <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-xl bg-card/90 px-3 py-2 text-xs shadow-card backdrop-blur">
          <p className="flex items-center gap-2 font-medium"><span aria-hidden className="size-3 rounded-full bg-[#ea580c]" /> Gare</p>
          <p className="mt-1 text-muted-foreground">Taille et pastille : lignes desservies</p>
        </div>

        {selected && (
          <aside className="absolute bottom-4 left-4 right-4 z-[500] max-w-sm rounded-2xl bg-card p-5 shadow-xl sm:right-auto" aria-label={`Gare ${selected.name}`}>
            <button type="button" onClick={() => setSelectedId(null)} aria-label="Fermer" className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X size={14} aria-hidden /></button>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#ea580c] text-white"><MapPin size={26} weight="fill" aria-hidden /></span>
              <div className="min-w-0"><h4 className="truncate text-lg font-bold">{selected.name}</h4><p className="text-sm text-muted-foreground">{selected.city}</p></div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-muted/70 p-3"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Buildings size={14} weight="duotone" aria-hidden />Compagnie</dt><dd className="mt-1 truncate font-semibold">{selected.companyName}</dd></div>
              <div className="rounded-xl bg-muted/70 p-3"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Path size={14} weight="duotone" aria-hidden />Lignes</dt><dd className="mt-1 text-xl font-bold tabular-nums">{selected.routeCount}</dd></div>
            </dl>
            <Link href={`/flotte/lignes?compagnie=${selected.companyId}&q=${encodeURIComponent(selected.city)}`} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-foreground hover:opacity-90">
              Voir les lignes de la gare <ArrowRight size={14} aria-hidden />
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}
