import { Check, PhoneScreen, Pill } from "./PhoneScreen";

const steps = [
  { code: "PENDING", label: "Enregistré", note: "Agence de départ", state: "done" },
  { code: "IN_TRANSIT", label: "En transit", note: "À bord du bus", state: "done" },
  { code: "AT_HUB", label: "Au hub", note: "Correspondance", state: "current" },
  { code: "DELIVERED", label: "Livré", note: "Remise au destinataire", state: "todo" },
] as const;

export function ParcelScreen() {
  return (
    <PhoneScreen
      label="Suivi de colis"
      title="PCL-EXEMPLE"
      subtitle="Transports Exemple"
      badge={<Pill tone="amber">Au hub</Pill>}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-navy/60">Statut actuel</p>
            <p className="font-mono text-xs font-bold text-navy">AT_HUB</p>
          </div>
          <span className="rounded-2xl bg-navy px-4 py-2.5 text-xs font-bold text-white">
            Actualiser
          </span>
        </div>
      }
    >
      <ol className="relative space-y-1">
        {steps.map((s, i) => (
          <li key={s.code} className="relative flex gap-3 pb-3 last:pb-0">
            {i < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={`absolute left-[13px] top-8 h-[calc(100%-1.5rem)] w-0.5 ${
                  s.state === "done" ? "bg-[#1fa36c]" : "border-l-2 border-dashed border-navy/20"
                }`}
              />
            ) : null}
            {s.state === "done" ? (
              <Check />
            ) : s.state === "current" ? (
              <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber">
                <span className="h-2.5 w-2.5 rounded-full bg-navy" />
              </span>
            ) : (
              <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 rounded-lg border-2 border-[#e2ddd0] bg-white" />
            )}
            <div className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2 shadow-[0_0_0_1px_rgb(30_39_73/0.06)]">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-extrabold ${s.state === "todo" ? "text-navy/50" : "text-navy"}`}>
                  {s.label}
                </p>
                <span className="font-mono text-[9px] font-semibold tracking-wide text-navy/50">{s.code}</span>
              </div>
              <p className="text-[11px] font-semibold text-navy/60">{s.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </PhoneScreen>
  );
}
