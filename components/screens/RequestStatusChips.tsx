const steps = [
  { label: "Reçue", state: "done" },
  { label: "En traitement", state: "current" },
  { label: "Devis prêt", state: "todo" },
] as const;

/** Request progress strip: received → being processed → quote ready. */
export function RequestStatusChips({ className = "" }: { className?: string }) {
  return (
    <ol className={`flex flex-wrap items-center gap-1.5 text-[11px] font-bold ${className}`}>
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-1.5">
          {i > 0 ? <span aria-hidden="true" className="text-navy/40">→</span> : null}
          <span
            className={`rounded-full px-2.5 py-1 ${
              s.state === "done"
                ? "bg-[#e3f3ea] text-[#16794d]"
                : s.state === "current"
                  ? "bg-amber text-navy"
                  : "border border-dashed border-navy/25 text-navy/50"
            }`}
          >
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
