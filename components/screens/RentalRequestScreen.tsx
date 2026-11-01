import { PhoneScreen, Pill } from "./PhoneScreen";

const buses = [
  { name: "Autocar 54 places", note: "Climatisé · soute à bagages", plate: "DK-XXXX", chosen: true },
  { name: "Minibus 28 places", note: "Idéal petits groupes", plate: "DK-YYYY", chosen: false },
] as const;

const fields = [
  { label: "Dates", value: "Du 12 au 14 · à préciser" },
  { label: "Trajet", value: "Dakar → Touba" },
  { label: "Passagers", value: "48" },
] as const;

/** Public booking-link page a customer opens: the company's buses, then a rental request. */
export function RentalRequestScreen({ className = "" }: { className?: string }) {
  return (
    <PhoneScreen
      label="LOCATION DE BUS"
      title="Transports Exemple"
      subtitle="Choisissez un bus, envoyez votre demande"
      className={className}
      footer={
        <span className="block rounded-2xl bg-amber px-4 py-3 text-center text-sm font-extrabold text-navy">
          Envoyer la demande
        </span>
      }
    >
      <div className="space-y-2">
        {buses.map((b) => (
          <div
            key={b.name}
            className={`flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 ${
              b.chosen ? "shadow-[0_0_0_2px_#f5a524]" : "shadow-[0_0_0_1px_rgb(30_39_73/0.06)]"
            }`}
          >
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M3 11h18M7 19v-3M17 19v-3" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold leading-tight text-navy">{b.name}</p>
              <p className="text-[11px] font-semibold text-navy/60">
                <span className="font-mono">{b.plate}</span> · {b.note}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-bold ${
                b.chosen ? "bg-amber text-navy" : "border border-navy/20 text-navy"
              }`}
            >
              {b.chosen ? "Choisi" : "Choisir"}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-2 mt-4 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-ink">
          Votre demande
        </p>
        <Pill tone="grey">Sur demande</Pill>
      </div>
      <div className="space-y-1.5">
        {fields.map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-[0_0_0_1px_rgb(30_39_73/0.06)]">
            <span className="text-[11px] font-semibold text-navy/60">{f.label}</span>
            <span className="truncate text-xs font-extrabold text-navy">{f.value}</span>
          </div>
        ))}
      </div>
    </PhoneScreen>
  );
}
