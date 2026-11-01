import { mockParcelSteps } from "@/content/mock-data";

export default function ParcelTrackingMock({ active = 2 }: { active?: number }) {
  return (
    <div className="min-h-[430px] bg-cream p-4 text-ink">
      <p className="text-xs font-semibold text-ink/70">Suivi de colis</p>
      <p className="mt-1 font-mono text-sm font-semibold">PCL-EXEMPLE</p>
      <ol className="mt-5 space-y-5">
        {mockParcelSteps.map((s, i) => {
          const done = i <= active;
          return (
            <li key={s.label} className="relative flex gap-3">
              {i < mockParcelSteps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[11px] top-6 h-[calc(100%+8px)] w-0.5 ${i < active ? "bg-forest" : "bg-ink/15"}`}
                />
              )}
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  done ? "bg-forest text-white" : "bg-ink/15 text-ink/70"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1">
                <span className={`block text-sm ${done ? "font-semibold" : "text-ink/70"}`}>{s.label}</span>
                <span className="block text-xs text-ink/70">{s.detail}</span>
              </span>
              <span className="text-xs text-ink/70">{s.time}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
