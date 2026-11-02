import { Check, Minus } from "@phosphor-icons/react/dist/ssr";
import { permissionDomainLabel } from "@/lib/labels";
import type { PermissionMatrix } from "@/lib/repos/access";

/** Permission × role matrix, one white block per domain. */
export function PermissionsMatrix({ matrix }: { matrix: PermissionMatrix }) {
  const { roles, groups } = matrix;
  const cols = `minmax(17rem,1.8fr) repeat(${Math.max(roles.length, 1)}, minmax(6.5rem,1fr))`;
  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[48rem] space-y-6">
        {groups.map((g) => (
          <section key={g.domain} aria-label={permissionDomainLabel(g.domain)} className="overflow-hidden rounded-2xl bg-white shadow-card dark:bg-card">
            <header className="grid items-end gap-x-2 border-b border-border bg-muted/50 px-5 py-4" style={{ gridTemplateColumns: cols }}>
              <h3 className="font-semibold">{permissionDomainLabel(g.domain)} <span className="font-normal tabular-nums text-muted-foreground">· {g.rows.length}</span></h3>
              {roles.map((r) => (
                <div key={r.code} className="text-center">
                  <p className="truncate text-sm font-bold">{r.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{r.code}</p>
                </div>
              ))}
            </header>
            <ul className="divide-y divide-border">
              {g.rows.map((row) => (
                <li key={row.code} className="grid items-center gap-x-2 px-5 py-4" style={{ gridTemplateColumns: cols }}>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold">{row.code}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.description}</p>
                  </div>
                  {roles.map((r) => {
                    const granted = row.grantedTo.includes(r.code);
                    return (
                      <div key={r.code} className="flex justify-center" data-testid={`grant-${r.code}-${row.code}`} data-granted={granted ? "true" : "false"}>
                        {granted ? (
                          <span className="flex size-7 items-center justify-center rounded-full bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300"><Check size={15} weight="bold" aria-hidden /></span>
                        ) : (
                          <span className="flex size-7 items-center justify-center text-muted-foreground/40"><Minus size={15} aria-hidden /></span>
                        )}
                        <span className="sr-only">{granted ? "Accordée" : "Non accordée"}</span>
                      </div>
                    );
                  })}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
