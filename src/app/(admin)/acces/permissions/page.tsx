import { Fragment } from "react";
import { PageHeader } from "@/components/data/page-header";
import { permissionDomainLabel } from "@/lib/labels";
import { permissionsRepo } from "@/lib/repos/access";

export const dynamic = "force-dynamic";

export default function PermissionsPage() {
  const { roles, groups } = permissionsRepo.matrix();
  return (
    <>
      <PageHeader
        title="Permissions"
        description="Matrice des permissions par rôle, regroupées par domaine (lecture seule)."
      />
      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Permission</th>
              {roles.map((r) => (
                <th key={r.code} scope="col" className="px-3 py-2 text-center font-medium">
                  {r.name}<span className="block font-mono text-[10px]">{r.code}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.domain}>
                <tr className="border-b border-border bg-muted/30">
                  <th colSpan={roles.length + 1} scope="colgroup" className="px-3 py-1.5 text-xs font-semibold uppercase">
                    {permissionDomainLabel(g.domain)}
                  </th>
                </tr>
                {g.rows.map((row) => (
                  <tr key={row.code} className="border-b border-border last:border-0">
                    <th scope="row" className="px-3 py-2 font-normal">
                      <span className="font-mono text-xs">{row.code}</span>
                      <span className="block text-xs text-muted-foreground">{row.description}</span>
                    </th>
                    {roles.map((r) => {
                      const granted = row.grantedTo.includes(r.code);
                      return (
                        <td
                          key={r.code} className="px-3 py-2 text-center"
                          data-testid={`grant-${r.code}-${row.code}`} data-granted={granted ? "true" : "false"}
                        >
                          {granted ? <span className="text-success" aria-hidden>✓</span> : <span className="text-muted-foreground" aria-hidden>·</span>}
                          <span className="sr-only">{granted ? "Accordée" : "Non accordée"}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
