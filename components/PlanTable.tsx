import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui";
import type { Plan } from "@/content/plans";

export default function PlanTable({ plans }: { plans: Plan[] }) {
  return (
    <ul className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
      {plans.map((p) => (
        <li
          key={p.name}
          className={`flex flex-col rounded-3xl border p-8 ${
            p.highlight ? "border-forest bg-white shadow-lift" : "border-ink/10 bg-white"
          }`}
        >
          <h2 className="text-2xl font-semibold">{p.name}</h2>
          <p className="mt-2 text-sm text-ink/70">{p.summary}</p>
          <p className="mt-5 text-3xl">Sur devis</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink/85">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <ButtonLink href="/demo" variant={p.highlight ? "primary" : "outline"}>
              Demander un devis
            </ButtonLink>
          </div>
        </li>
      ))}
    </ul>
  );
}
