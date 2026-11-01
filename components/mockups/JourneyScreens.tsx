import { mockTrips } from "@/content/mock-data";
import SeatMapMock from "./SeatMapMock";
import TicketMock from "./TicketMock";

const shell = "min-h-[440px] bg-cream p-4 text-ink";

export function TripsScreen() {
  return (
    <div className={shell}>
      <p className="text-xs font-semibold text-ink/70">Rechercher un trajet</p>
      <div className="mt-2 rounded-xl border border-ink/10 bg-white p-3 text-sm">
        Dakar → Saint-Louis
        <span className="block text-xs text-ink/70">Demain · 1 passager</span>
      </div>
      <ul className="mt-4 space-y-2">
        {mockTrips.slice(0, 3).map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-soft">
            <span>
              <b>{t.departure}</b>
              <span className="block text-xs text-ink/70">{t.route}</span>
            </span>
            <span className="text-xs font-semibold text-forest">{t.price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SeatsScreen() {
  return (
    <div className={shell}>
      <p className="mb-3 text-xs font-semibold text-ink/70">Choisissez votre siège</p>
      <div className="scale-[0.82] origin-top">
        <SeatMapMock />
      </div>
    </div>
  );
}

export function PaymentScreen() {
  const methods = ["Mobile money", "Carte", "Espèces au guichet"];
  return (
    <div className={shell}>
      <p className="text-xs font-semibold text-ink/70">Paiement</p>
      <div className="mt-2 rounded-xl border border-ink/10 bg-white p-3 text-sm">
        <p className="font-medium">Dakar → Saint-Louis · 06:30</p>
        <p className="text-xs text-ink/70">Siège 14</p>
        <p className="mt-2 flex justify-between border-t border-ink/10 pt-2 font-semibold">
          <span>Total</span><span>5 000 F</span>
        </p>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {methods.map((m, i) => (
          <li
            key={m}
            className={`rounded-xl border p-3 ${i === 0 ? "border-forest bg-forest/5 font-medium" : "border-ink/10 bg-white text-ink/70"}`}
          >
            {m}
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-full bg-forest px-4 py-2.5 text-center text-sm font-semibold text-white">
        Payer
      </p>
    </div>
  );
}

export function TicketScreen() {
  return (
    <div className={shell}>
      <p className="mb-3 text-xs font-semibold text-ink/70">Réservation confirmée</p>
      <TicketMock />
    </div>
  );
}
