import { Badge } from "./Frame";
import { mockServices } from "@/content/mock-data";

export default function SupervisionMock() {
  return (
    <div className="space-y-4 bg-cream p-4 text-ink sm:p-5">
      <p className="font-serif text-lg">Santé de la plateforme</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {mockServices.map((s) => (
          <li key={s.name} className="rounded-xl border border-ink/10 bg-white p-3">
            <p className="text-xs text-ink/70">{s.name}</p>
            <div className="mt-1">
              <Badge tone={s.tone}>{s.tone === "ok" ? "En service" : "Ralenti"}</Badge>
            </div>
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-ink/10 bg-white p-3 text-sm">
        <p className="text-xs font-semibold">Incidents</p>
        <p className="mt-2 flex items-center justify-between">
          <span>Lenteur sur le service clients</span>
          <Badge tone="warn">En cours</Badge>
        </p>
      </div>
    </div>
  );
}
