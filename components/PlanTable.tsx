import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui";
import { Coupon } from "@/components/Coupon";
import type { Plan } from "@/content/plans";

export default function PlanTable({ plans }: { plans: Plan[] }) {
  return (
    <ul className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-stretch [&>*]:min-w-0">
      {plans.map((p, i) => (
        <li key={p.name} className={`flex ${p.highlight ? "lg:-mt-3 lg:mb-3" : ""}`}>
          <Coupon
            className={`w-full ${p.highlight ? "shadow-lift ring-2 ring-amber" : "ring-1 ring-navy/10"}`}
            stub={
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-start">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-navy/70">
                    Tarif
                  </p>
                  <p className="mt-1 whitespace-nowrap text-3xl font-extrabold tracking-tight text-navy">Sur devis</p>
                </div>
                <ButtonLink href="/demo" variant={p.highlight ? "accent" : "outline"}>
                  Demander un devis
                </ButtonLink>
              </div>
            }
          >
            <p className="font-mono text-xs font-semibold tracking-[0.18em] text-amber-ink">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-navy">{p.name}</h2>
            <p className="mt-2 text-sm text-ink/70">{p.summary}</p>
            <ul className="mt-6 space-y-3 text-sm text-ink/85">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" />
                  {f}
                </li>
              ))}
            </ul>
          </Coupon>
        </li>
      ))}
    </ul>
  );
}
