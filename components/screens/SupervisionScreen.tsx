import { PhoneScreen, Pill } from "./PhoneScreen";

const services = [
  "Identité",
  "Flotte",
  "Réservations",
  "Colis",
  "Équipes",
  "Clients",
  "Notifications",
  "Conformité",
];

export function SupervisionScreen() {
  return (
    <PhoneScreen
      variant="panel"
      label="Supervision plateforme"
      title="Équipe Sira"
      subtitle="État des services"
      badge={<Pill tone="navy">Interne</Pill>}
    >
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {services.map((s) => (
          <div key={s} className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-[0_0_0_1px_rgb(30_39_73/0.06)]">
            <span className="text-[13px] font-extrabold text-navy">{s}</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[#16794d]">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#1fa36c]" />
              OK
            </span>
          </div>
        ))}
      </div>
      <p className="mb-2 mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-ink">
        Incident
      </p>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-[0_0_0_1px_rgb(30_39_73/0.06)]">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-bold text-navy">SYS-EXEMPLE</p>
          <p className="text-xs font-semibold text-navy/60">Service Notifications</p>
        </div>
        <Pill tone="amber">En cours</Pill>
      </div>
    </PhoneScreen>
  );
}
