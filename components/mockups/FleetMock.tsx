import { Badge } from "./Frame";
import { mockBuses, mockMaintenanceSteps } from "@/content/mock-data";

export default function FleetMock() {
  return (
    <div className="space-y-4 bg-cream p-4 text-ink sm:p-5">
      <div className="flex items-center justify-between">
        <p className="font-serif text-lg">Flotte</p>
        <span className="rounded-full bg-forest px-3 py-1 text-xs font-semibold text-white">
          Ajouter un bus
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="border-b border-ink/10 text-xs text-ink/55">
            <tr>
              <th className="px-3 py-2 font-medium">Immatriculation</th>
              <th className="px-3 py-2 font-medium">Modèle</th>
              <th className="px-3 py-2 font-medium">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {mockBuses.map((b) => (
              <tr key={b.plate}>
                <td className="px-3 py-2 font-medium">{b.plate}</td>
                <td className="px-3 py-2 text-ink/70">{b.model}</td>
                <td className="px-3 py-2">
                  <Badge tone={b.tone}>{b.state}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border border-ink/10 bg-white p-3">
        <p className="text-xs font-semibold">Maintenance du bus DK-5678-B</p>
        <ol className="mt-3 flex items-center gap-2 text-xs">
          {mockMaintenanceSteps.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold ${
                  i <= 1 ? "bg-forest text-white" : "bg-ink/10 text-ink/60"
                }`}
              >
                {i + 1}
              </span>
              <span className={i <= 1 ? "font-medium" : "text-ink/60"}>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
