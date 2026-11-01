import type { PresenceLocation } from "@/content/presence";

export default function PresenceMap({
  locations,
}: {
  locations: PresenceLocation[];
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-[var(--shadow-soft)]">
      {/* Carte (les pays couverts sont surlignés en ambre) */}
      <img
        src="/images/carte-afrique-ouest.png"
        alt="Carte de présence de Sira en Afrique de l'Ouest : Sénégal, Guinée et Côte d'Ivoire"
        className="h-auto w-full"
      />

      {/* Légende */}
      <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-primary shadow-sm ring-1 ring-primary/10 backdrop-blur-sm">
        <span className="h-2 w-2 rounded-full bg-accent" />
        {locations.length} hubs · {locations.length} pays
      </div>

      {/* Points */}
      {locations.map((loc) => (
        <div
          key={loc.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
        >
          <span className="relative flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary-deep ring-2 ring-white" />
          </span>
          <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white/85 px-2.5 py-1.5 text-center shadow-sm backdrop-blur-sm">
            <p className="text-sm font-semibold leading-tight text-primary">
              {loc.city}
            </p>
            <p className="text-[11px] leading-tight text-primary/60">
              {loc.country}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
