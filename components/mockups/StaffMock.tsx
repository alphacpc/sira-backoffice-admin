import { Badge } from "./Frame";
import { mockStaff } from "@/content/mock-data";

const payslip = ["Brouillon", "Traité", "Payé"];

export default function StaffMock() {
  return (
    <div className="space-y-4 bg-cream p-4 text-ink sm:p-5">
      <p className="text-lg">Employés</p>
      <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white text-sm">
        {mockStaff.map((e) => (
          <li key={e.name} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span>
              <span className="font-medium">{e.name}</span>
              <span className="block text-xs text-ink/70">{e.role}</span>
            </span>
            <Badge tone={e.tone}>{e.status}</Badge>
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-ink/10 bg-white p-3">
        <p className="text-xs font-semibold">Bulletin de paie</p>
        <ol className="mt-3 flex items-center gap-2 text-xs">
          {payslip.map((s, i) => (
            <li key={s} aria-current={i === 0 ? "step" : undefined} className="flex flex-1 items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full font-semibold ${i === 0 ? "bg-forest text-white" : "bg-ink/10 text-ink/70"}`}>
                {i + 1}
              </span>
              <span className={i === 0 ? "font-medium" : "text-ink/70"}>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
