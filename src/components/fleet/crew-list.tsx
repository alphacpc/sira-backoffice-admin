import Link from "next/link";
import { DetailRow } from "@/components/data/detail-row";
import { crewRoleLabel } from "@/lib/labels";
import type { CrewAssignment } from "@/lib/repos/fleet";

/** Server Component: the three crew assignments of a bus; each assigned member links to their page. */
export function CrewList({ crew }: { crew: CrewAssignment[] }) {
  return (
    <dl>
      {crew.map((c) => (
        <DetailRow key={c.role} label={crewRoleLabel(c.role)}>
          <span data-testid={`crew-${c.role}`} className={c.name ? undefined : "text-muted-foreground"}>
            {c.name && c.id ? <Link href={`/flotte/equipage/${c.id}`} className="text-accent-text hover:underline">{c.name}</Link> : c.name ?? "Non affecté"}
          </span>
        </DetailRow>
      ))}
    </dl>
  );
}
