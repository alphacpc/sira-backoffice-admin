import { stationCoords, cityCoords } from "@/lib/geo";
import { routeLabel, type TripRow } from "@/lib/repos/fleet";
import { fleetHubRepo } from "@/lib/repos/fleet-hub";
import roadData from "@/lib/data/road-routes.json";
import { getStore } from "@/lib/repos/store";
import type { TripStatus } from "@/lib/types";

export interface StationPin {
  id: string; name: string; city: string; companyId: string; companyName: string; routeCount: number;
  lat: number; lng: number;
}

export interface TripPath {
  id: string; routeLabel: string; fromCity: string; toCity: string; from: [number, number]; to: [number, number];
  status: TripStatus; companyName: string; busPlate: string; departure: string; arrival: string;
  price: number; currency: string; totalSeats: number; availableSeats: number;
  /** 0 before departure, then the share of the journey elapsed (clamped to 1). */
  progress: number;
  /** Key of the real road between the two cities (see `roads`), `null` when the road is unknown. */
  roadKey: string | null;
  /** True when the trip runs against the stored direction of the road. */
  reversed: boolean;
}

/** A road between two cities, driven by a routing engine: stored once, shared by every trip on it. */
export interface Road { km: number; minutes: number; points: [number, number][] }

const ROADS = roadData as unknown as Record<string, { km: number; min: number; pts: [number, number][] }>;

function roadOf(a: string, b: string): { key: string; reversed: boolean } | null {
  if (ROADS[`${a}|${b}`]) return { key: `${a}|${b}`, reversed: false };
  if (ROADS[`${b}|${a}`]) return { key: `${b}|${a}`, reversed: true };
  return null;
}

export const fleetMapRepo = {
  /** Stations placed on the map (only those whose city has known coordinates), after search and filters. */
  stations(q?: string, f: { companyId?: string; city?: string } = {}): StationPin[] {
    const all = getStore().stations;
    // Rank of a station within its city (stable by id): drives its offset from the city centre.
    const rank = new Map<string, number>();
    const seen = new Map<string, number>();
    for (const st of [...all].sort((a, b) => a.id.localeCompare(b.id))) {
      const n = seen.get(st.city) ?? 0;
      rank.set(st.id, n);
      seen.set(st.city, n + 1);
    }
    return fleetHubRepo.stations(q, { companyId: f.companyId })
      .filter((s) => !f.city || s.city === f.city)
      .flatMap((s): StationPin[] => {
        const pos = stationCoords(s.city, rank.get(s.id) ?? 0);
        return pos ? [{ id: s.id, name: s.name, city: s.city, companyId: s.companyId, companyName: s.companyName, routeCount: s.routeCount, lat: pos[0], lng: pos[1] }] : [];
      });
  },

  cities(): string[] {
    return [...new Set(getStore().stations.map((s) => s.city))].sort((a, b) => a.localeCompare(b, "fr"));
  },

  /** Trips drawn on the map: origin and destination cities must be known. */
  trips(rows: TripRow[], now: Date = new Date()): TripPath[] {
    const s = getStore();
    return rows.flatMap((t): TripPath[] => {
      const route = s.routes.find((r) => r.id === t.routeId);
      const cityOf = (id?: string) => s.stations.find((x) => x.id === id)?.city;
      const fromCity = cityOf(route?.originId);
      const toCity = cityOf(route?.destinationId);
      const from = fromCity ? cityCoords(fromCity) : null;
      const to = toCity ? cityCoords(toCity) : null;
      if (!fromCity || !toCity || !from || !to) return [];
      const dep = Date.parse(t.departure);
      const arr = Date.parse(t.arrival);
      const progress = t.status === "departed" && arr > dep ? Math.min(1, Math.max(0, (now.getTime() - dep) / (arr - dep))) : 0;
      const road = roadOf(fromCity, toCity);
      return [{
        roadKey: road?.key ?? null, reversed: road?.reversed ?? false,
        id: t.id, routeLabel: routeLabel(t.routeId), fromCity, toCity, from, to, status: t.status, companyName: t.companyName,
        busPlate: t.busPlate, departure: t.departure, arrival: t.arrival, price: t.price, currency: t.currency,
        totalSeats: t.totalSeats, availableSeats: t.availableSeats, progress,
      }];
    });
  },

  /** The roads used by these trips (each one only once). */
  roads(paths: TripPath[]): Record<string, Road> {
    const out: Record<string, Road> = {};
    for (const p of paths) {
      if (p.roadKey && !out[p.roadKey]) {
        const r = ROADS[p.roadKey]!;
        out[p.roadKey] = { km: r.km, minutes: r.min, points: r.pts };
      }
    }
    return out;
  },
};
