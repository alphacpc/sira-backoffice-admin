import { PageHeader } from "@/components/data/page-header";
import { formatNumber } from "@/lib/format";
import { tiersRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

export default function PartnerTiersPage() {
  const tiers = tiersRepo.list();
  return (
    <>
      <PageHeader
        title="Paliers partenaires"
        description="Remise accordée selon l'ancienneté d'une compagnie sur la plateforme (lecture seule)."
      />
      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Palier</th>
              <th className="px-3 py-2 font-medium">Ancienneté minimale</th>
              <th className="px-3 py-2 font-medium">Remise</th>
              <th className="px-3 py-2 font-medium">Compagnies</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.code} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium">{t.code}</td>
                <td className="px-3 py-2">{t.minMonths === 0 ? "Dès l'activation" : `${t.minMonths} mois`}</td>
                <td className="px-3 py-2 tabular-nums">{t.discountPercent} %</td>
                <td className="px-3 py-2 tabular-nums" data-testid={`tier-companies-${t.code}`}>{formatNumber(t.companies)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
