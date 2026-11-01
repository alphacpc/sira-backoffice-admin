import { Badge } from "./Frame";
import { mockTrips } from "@/content/mock-data";

const nav = ["Tableau de bord", "Flotte", "Trajets", "Réservations", "Colis", "Équipes"];
const kpis = [
  { label: "Réservations du jour", value: "128" },
  { label: "Remplissage moyen", value: "82 %" },
  { label: "Colis en transit", value: "14" },
  { label: "Bus en maintenance", value: "2" },
];
const bars = [38, 52, 44, 66, 58, 74, 62];

export default function DashboardMock() {
  return (
    <div className="grid min-h-[360px] grid-cols-1 bg-cream text-ink md:grid-cols-[150px_1fr]">
      <aside className="hidden border-r border-ink/10 bg-white p-4 md:block">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink/70">
          Transports Exemple
        </p>
        <ul className="space-y-1 text-sm">
          {nav.map((item, i) => (
            <li
              key={item}
              className={`rounded-lg px-3 py-2 ${i === 0 ? "bg-forest/10 font-semibold text-forest" : "text-ink/70"}`}
            >
              {item}
            </li>
          ))}
        </ul>
      </aside>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-ink/10 bg-white p-3">
              <p className="text-[11px] text-ink/70">{k.label}</p>
              <p className="mt-1 text-2xl">{k.value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-ink/10 bg-white p-3">
            <p className="mb-2 text-xs font-semibold">Prochains départs</p>
            <ul className="divide-y divide-ink/10 text-sm">
              {mockTrips.slice(0, 3).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium">{t.departure}</span>{" "}
                    <span className="text-ink/70">{t.route}</span>
                  </span>
                  <Badge tone={t.tone}>{t.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-ink/10 bg-white p-3">
            <p className="mb-2 text-xs font-semibold">Ventes sur 7 jours</p>
            <div className="flex h-24 items-end gap-1.5" aria-hidden="true">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-forest/70" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
