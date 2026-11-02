"use client";

import dynamic from "next/dynamic";

function MapSkeleton() {
  return <div className="flex h-[calc(100vh-17rem)] min-h-[38rem] items-center justify-center rounded-2xl bg-muted/50 text-sm text-muted-foreground">Chargement de la carte…</div>;
}

/** Leaflet needs the browser: the maps are loaded on the client only. */
export const StationsMapLoader = dynamic(() => import("./stations-map").then((m) => m.StationsMap), { ssr: false, loading: MapSkeleton });
export const TripsMapLoader = dynamic(() => import("./trips-map").then((m) => m.TripsMap), { ssr: false, loading: MapSkeleton });
