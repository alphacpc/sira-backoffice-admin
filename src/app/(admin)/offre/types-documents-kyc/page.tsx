import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { kycTypeStatusBadge } from "@/lib/labels";
import { kycTypesRepo } from "@/lib/repos/billing";
import { KycTypeToggle } from "./kyc-type-toggle";

export const dynamic = "force-dynamic";

export default function KycTypesPage() {
  const types = kycTypesRepo.list();
  const requiredActive = kycTypesRepo.requiredActive().length;
  return (
    <>
      <PageHeader
        title="Types de documents KYC"
        description="Documents exigés pour activer une compagnie. Un type désactivé n'est plus exigé."
      />
      <p className="mb-4 text-sm text-muted-foreground">
        {requiredActive} type(s) obligatoire(s) actif(s). Le dernier type obligatoire actif ne peut pas être désactivé.
      </p>
      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Nom</th>
              <th className="px-3 py-2 font-medium">Obligatoire</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => {
              const b = kycTypeStatusBadge(t.active);
              return (
                <tr key={t.code} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{t.code}</td>
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2">{t.required ? "Oui" : "Non"}</td>
                  <td className="px-3 py-2" data-testid={`kyc-type-status-${t.code}`}>
                    <StatusBadge tone={b.tone}>{b.label}</StatusBadge>
                  </td>
                  <td className="px-3 py-2">
                    <KycTypeToggle code={t.code} name={t.name} active={t.active} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
