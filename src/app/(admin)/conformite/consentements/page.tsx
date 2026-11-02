import { ConsentLookup } from "@/components/compliance/consent-lookup";
import { PageHeader } from "@/components/data/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { consentTypeLabel } from "@/lib/labels";
import { consentsRepo } from "@/lib/repos/compliance";

export const dynamic = "force-dynamic";

export default function ConsentsPage() {
  const summary = consentsRepo.summary();
  return (
    <>
      <PageHeader
        title="Consentements"
        description="États courants par type et par compagnie. L'historique d'un utilisateur se consulte avec un motif d'accès déclaré et journalisé."
      />
      <Card className="mb-6">
        <CardHeader><CardTitle>États courants</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">Consentement</th>
                <th className="py-1 font-medium">Portée</th>
                <th className="py-1 font-medium">Accordés</th>
                <th className="py-1 font-medium">Retirés</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={`${s.consentType}-${s.companyName}`} className="border-t border-border">
                  <td className="py-1.5 font-medium">{consentTypeLabel(s.consentType)}</td>
                  <td>{s.companyName}</td>
                  <td className="tabular-nums">{s.granted}</td>
                  <td className="tabular-nums">{s.withdrawn}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            Une ligne « Sans compagnie (ancien) » est un consentement marketing antérieur à la portée par compagnie : il n&apos;autorise aucun envoi.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Consulter l&apos;historique d&apos;un utilisateur</CardTitle></CardHeader>
        <CardContent><ConsentLookup users={consentsRepo.userOptions()} /></CardContent>
      </Card>
    </>
  );
}
