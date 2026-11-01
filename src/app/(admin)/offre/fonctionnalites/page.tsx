import Link from "next/link";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { featureKindLabel } from "@/lib/labels";
import { featuresRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

export default function FeaturesPage() {
  const features = featuresRepo.list();
  return (
    <>
      <PageHeader
        title="Fonctionnalités"
        description="Catalogue des fonctionnalités que les plans peuvent inclure (lecture seule)."
      />
      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Nom</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Plans qui l&apos;incluent</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.code} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{f.code}</td>
                <td className="px-3 py-2 font-medium">{f.name}</td>
                <td className="px-3 py-2">{featureKindLabel(f.kind)}</td>
                <td className="px-3 py-2">
                  {f.plans.length === 0 ? (
                    <span className="text-muted-foreground">Aucun</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {f.plans.map((p) => (
                        <Link key={p.id} href={`/offre/plans/${p.id}`}>
                          <StatusBadge tone={p.status === "active" ? "info" : "neutral"}>
                            {p.name}{p.status === "inactive" ? " (inactif)" : ""}
                          </StatusBadge>
                        </Link>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
