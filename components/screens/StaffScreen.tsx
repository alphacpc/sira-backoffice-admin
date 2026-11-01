import { PhoneScreen, Pill } from "./PhoneScreen";

const people = [
  { name: "Awa D.", role: "Chauffeur", status: "Actif", tone: "green" },
  { name: "Moussa K.", role: "Guichetier", status: "Actif", tone: "green" },
  { name: "Fatou S.", role: "Contrôleuse", status: "Suspendu", tone: "grey" },
] as const;

export function StaffScreen() {
  return (
    <PhoneScreen
      label="Équipes"
      title="Transports Exemple"
      subtitle="Employés de la compagnie"
      className="max-w-[300px]"
    >
      <div className="space-y-2">
        {people.map((p) => (
          <div key={p.name} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-[0_0_0_1px_rgb(30_39_73/0.06)]">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white">
              {p.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-navy">{p.name}</p>
              <p className="text-[11px] font-semibold text-navy/60">{p.role}</p>
            </div>
            <Pill tone={p.tone}>{p.status}</Pill>
          </div>
        ))}
      </div>

      <p className="mb-2 mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-ink">
        Demande de congé
      </p>
      <div className="rounded-2xl bg-white p-3 shadow-[0_0_0_1px_rgb(30_39_73/0.06)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-extrabold text-navy">A. Diop</p>
            <p className="text-[11px] font-semibold text-navy/60">Congé payé · 5 jours</p>
          </div>
          <Pill tone="amber">À approuver</Pill>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-bold">
          <span className="rounded-xl bg-navy py-2 text-white">Approuver</span>
          <span className="rounded-xl border border-navy/20 py-2 text-navy">Refuser</span>
        </div>
      </div>

      <p className="mb-2 mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-ink">
        Bulletin de paie
      </p>
      <div className="flex items-center gap-1.5 text-[11px] font-bold">
        <span className="rounded-full bg-[#efece4] px-2.5 py-1 text-navy/60">Brouillon</span>
        <span aria-hidden="true" className="text-navy/40">→</span>
        <span className="rounded-full bg-amber px-2.5 py-1 text-navy">Traité</span>
        <span aria-hidden="true" className="text-navy/40">→</span>
        <span className="rounded-full border border-dashed border-navy/25 px-2.5 py-1 text-navy/50">Payé</span>
      </div>
    </PhoneScreen>
  );
}
