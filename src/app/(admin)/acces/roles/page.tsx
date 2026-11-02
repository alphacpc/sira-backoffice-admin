import Link from "next/link";
import { PageHeader } from "@/components/data/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { permissionDomainLabel } from "@/lib/labels";
import { PERMISSION_DOMAINS, rolesRepo } from "@/lib/repos/access";

export const dynamic = "force-dynamic";

export default function RolesPage() {
  const roles = rolesRepo.listRows();
  return (
    <>
      <PageHeader
        title="Rôles"
        description="Les rôles de la plateforme et les permissions qu'ils portent (lecture seule)."
      />
      <div className="space-y-4">
        {roles.map((r) => (
          <Card key={r.code}>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{r.name} <span className="font-mono text-xs text-muted-foreground">{r.code}</span></h2>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <Link href={`/utilisateurs?role=${r.code}`} className="hover:underline" data-testid={`role-users-${r.code}`}>
                    {r.userCount} utilisateur(s)
                  </Link>
                  <span data-testid={`role-permissions-${r.code}`}>{r.permissions.length} permission(s)</span>
                </div>
              </div>
              {r.permissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune permission.</p>
              ) : (
                <details>
                  <summary className="cursor-pointer text-sm text-accent-text">Permissions du rôle « {r.name} »</summary>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {PERMISSION_DOMAINS.map((d) => {
                      const perms = r.permissions.filter((p) => p.domain === d);
                      if (perms.length === 0) return null;
                      return (
                        <div key={d}>
                          <h3 className="text-xs font-semibold uppercase text-muted-foreground">{permissionDomainLabel(d)}</h3>
                          <ul className="mt-1 space-y-1 text-sm">
                            {perms.map((p) => (
                              <li key={p.code}><span className="font-mono text-xs">{p.code}</span> · {p.description}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
