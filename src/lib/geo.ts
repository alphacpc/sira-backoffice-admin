/** City centres (latitude, longitude) of the Senegalese network; the demo data only knows cities. */
export const CITY_COORDS: Record<string, [number, number]> = {
  Dakar: [14.7167, -17.4677], "Thiès": [14.791, -16.9359], "Saint-Louis": [16.0179, -16.4896], Touba: [14.85, -15.8833],
  Kaolack: [14.1652, -16.0753], Ziguinchor: [12.5833, -16.2719], Mbour: [14.4198, -16.9639], Tambacounda: [13.7707, -13.6673],
  Kolda: [12.8833, -14.95], Louga: [15.6167, -16.2167], Diourbel: [14.6553, -16.2314], Fatick: [14.339, -16.4111],
  "Richard-Toll": [16.4625, -15.7003], Saly: [14.45, -17.0167], "Kédougou": [12.5576, -12.1747], Matam: [15.6559, -13.2554],
};

/** Centre of Senegal, used when nothing is shown. */
export const SENEGAL_CENTER: [number, number] = [14.4974, -14.4524];

export function cityCoords(city: string): [number, number] | null {
  return CITY_COORDS[city] ?? null;
}

/**
 * Position of the `index`-th station of a city: the first sits on the city centre, the following ones are
 * spread on a small ring so that several stations of one city do not overlap.
 */
export function stationCoords(city: string, index: number): [number, number] | null {
  const c = cityCoords(city);
  if (!c) return null;
  if (index === 0) return c;
  const angle = (index * 137.5 * Math.PI) / 180;
  const radius = 0.012 + 0.006 * Math.floor((index - 1) / 6);
  return [c[0] + radius * Math.sin(angle), c[1] + (radius * Math.cos(angle)) / Math.cos((c[0] * Math.PI) / 180)];
}

/** Points of a curved line from `a` to `b` (quadratic Bézier bulging to one side). */
export function arc(a: [number, number], b: [number, number], steps = 48): [number, number][] {
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const bend = 0.18;
  const ctrl: [number, number] = [mid[0] + dx * bend, mid[1] - dy * bend];
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * ctrl[0] + t * t * b[0], u * u * a[1] + 2 * u * t * ctrl[1] + t * t * b[1]];
  });
}
