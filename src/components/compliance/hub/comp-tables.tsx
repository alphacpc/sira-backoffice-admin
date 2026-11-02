"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatDateTime } from "@/lib/format";
import { accessReasonLabel, auditActorTypeLabel } from "@/lib/labels";
import type { AccessRow, AuditRow } from "@/lib/repos/compliance";
import { AccessPill, ActionPill, ActorAvatar, CategoryPill } from "./pills";

const SUBJECT = { CUSTOMER: "Client", EMPLOYEE: "Employé", USER: "Utilisateur" } as const;

const auditColumns: ColumnDef<AuditRow, unknown>[] = [
  {
    id: "actor", header: "Acteur", accessorFn: (r) => r.actorLabel,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ActorAvatar name={row.original.actorLabel} system={row.original.actorType === "SYSTEM"} />
        <div><p className="font-semibold">{row.original.actorLabel}</p><p className="text-xs text-muted-foreground">{auditActorTypeLabel(row.original.actorType)}</p></div>
      </div>
    ),
  },
  { accessorKey: "action", header: "Action", cell: ({ row }) => <ActionPill action={row.original.action} /> },
  {
    id: "entity", header: "Objet", accessorFn: (r) => `${r.entityType} ${r.entityRef}`,
    cell: ({ row }) => <div><p className="font-medium">{row.original.entityType}</p><p className="font-mono text-xs text-muted-foreground">{row.original.entityRef}</p></div>,
  },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "sourceService", header: "Service", cell: ({ row }) => <span className="font-mono text-xs">{row.original.sourceService ?? "—"}</span> },
  { accessorKey: "ipTruncated", header: "IP", cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.ipTruncated}</span> },
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
];

export function AuditList({ rows }: { rows: AuditRow[] }) {
  return <DataTable columns={auditColumns} data={rows} rowHref={(r) => `/conformite/journal-audit/${r.id}`} searchable={false} emptyMessage="Aucune ligne de journal." />;
}

const accessColumns: ColumnDef<AccessRow, unknown>[] = [
  {
    id: "by", header: "Consulté par", accessorFn: (r) => r.accessedByLabel,
    cell: ({ row }) => <div className="flex items-center gap-3"><ActorAvatar name={row.original.accessedByLabel} /><span className="font-semibold">{row.original.accessedByLabel}</span></div>,
  },
  { accessorKey: "accessType", header: "Accès", cell: ({ row }) => <AccessPill type={row.original.accessType} /> },
  {
    id: "subject", header: "Personne concernée", accessorFn: (r) => r.subjectName,
    cell: ({ row }) => <div><p className="font-medium">{row.original.subjectName}</p><p className="text-xs text-muted-foreground">{SUBJECT[row.original.subjectType]}</p></div>,
  },
  { accessorKey: "dataCategory", header: "Donnée", cell: ({ row }) => <CategoryPill category={row.original.dataCategory} /> },
  { id: "reason", header: "Motif", accessorFn: (r) => accessReasonLabel(r.accessReason) },
  { accessorKey: "ipTruncated", header: "IP", cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.ipTruncated}</span> },
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
];

export function AccessList({ rows }: { rows: AccessRow[] }) {
  return <DataTable columns={accessColumns} data={rows} searchable={false} emptyMessage="Aucun accès enregistré." />;
}
