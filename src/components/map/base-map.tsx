"use client";

import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import L from "leaflet";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { MapContainer, ZoomControl, useMap } from "react-leaflet";
import { SENEGAL_CENTER } from "@/lib/geo";

/** Free vector basemaps (OpenFreeMap, no API key): a light and a dark style that follow the theme. */
const STYLES = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" } as const;

function VectorBasemap({ dark }: { dark: boolean }) {
  const map = useMap();
  useEffect(() => {
    const layer = maplibreGL({ style: dark ? STYLES.dark : STYLES.light, attributionControl: false });
    layer.addTo(map);
    return () => { layer.remove(); };
  }, [map, dark]);
  return null;
}

/** Moves the view to `bounds` (or the whole country when empty) whenever it changes. */
export function FitView({ bounds, padding = 70 }: { bounds: [number, number][]; padding?: number }) {
  const map = useMap();
  const key = bounds.map((b) => b.join(",")).join(";");
  useEffect(() => {
    if (bounds.length === 0) map.flyTo(SENEGAL_CENTER, 6, { duration: 0.8 });
    else if (bounds.length === 1) map.flyTo(bounds[0]!, 11, { duration: 0.8 });
    else map.flyToBounds(L.latLngBounds(bounds), { padding: [padding, padding], duration: 0.9, maxZoom: 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export function BaseMap({ children, className }: { children: React.ReactNode; className?: string }) {
  const { resolvedTheme } = useTheme();
  return (
    <MapContainer attributionControl center={SENEGAL_CENTER} zoom={6} minZoom={5} scrollWheelZoom zoomControl={false} className={className} style={{ height: "100%", width: "100%" }}>
      <VectorBasemap dark={resolvedTheme === "dark"} />
      <ZoomControl position="bottomright" />
      {children}
    </MapContainer>
  );
}

const BUS_SVG = '<svg viewBox="0 0 24 24"><path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM6 11V6h12v5H6z"/></svg>';
const PIN_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>';

/** Station marker: a round bubble whose size follows the number of lines, with that number as a badge. */
export function stationIcon(opts: { lines: number; selected: boolean; dim: boolean }): L.DivIcon {
  const size = Math.min(46, 32 + opts.lines * 3);
  return L.divIcon({
    className: "", iconSize: [44, 52], iconAnchor: [22, 50],
    html: `<div class="sira-pin ${opts.selected ? "is-selected" : ""} ${opts.dim ? "is-dim" : ""}"><div class="sira-pin__bubble" style="width:${size}px;height:${size}px">${PIN_SVG}${opts.lines > 0 ? `<span class="sira-pin__count">${opts.lines}</span>` : ""}</div></div>`,
  });
}

export function endpointIcon(color: string): L.DivIcon {
  return L.divIcon({ className: "", iconSize: [14, 14], iconAnchor: [7, 7], html: `<div class="sira-end" style="--c:${color}"></div>` });
}

/** A city of the network: a dot and its name. */
export function cityIcon(name: string, active: boolean): L.DivIcon {
  const safe = name.replace(/[<>&"]/g, "");
  return L.divIcon({
    className: "", iconSize: [0, 0], iconAnchor: [0, 0],
    html: `<div class="sira-city ${active ? "is-active" : ""}"><span class="sira-city__dot"></span><span class="sira-city__name">${safe}</span></div>`,
  });
}

export function busIcon(color: string): L.DivIcon {
  return L.divIcon({ className: "", iconSize: [34, 34], iconAnchor: [17, 17], html: `<div class="sira-bus" style="--c:${color}">${BUS_SVG}</div>` });
}
