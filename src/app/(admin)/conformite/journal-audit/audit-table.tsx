"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { auditActionLabel, auditActorTypeLabel } from "@/lib/labels";
import type { AuditRow } from "@/lib/repos/compliance";

const columns: ColumnDef<AuditRow, unknown>[] = [
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "actorLabel", header: "Acteur" },
  { id: "actorType", header: "Type d'acteur", accessorFn: (r) => auditActorTypeLabel(r.actorType) },
  {
    accessorKey: "action", header: "Action",
    cell: ({ row }) => (
      <StatusBadge tone={row.original.action === "LOGIN_FAILED" ? "danger" : "neutral"}>{auditActionLabel(row.original.action)}</StatusBadge>
    ),
  },
  {
    id: "entity", header: "Entité", accessorFn: (r) => `${r.entityType} ${r.entityRef}`,
    cell: ({ row }) => (
      <span>{row.original.entityType} <span className="text-xs text-muted-foreground">{row.original.entityRef}</span></span>
    ),
  },
  { accessorKey: "sourceService", header: "Service", cell: ({ row }) => row.original.sourceService ?? "—" },
  { accessorKey: "ipTruncated", header: "Adresse IP" },
];

export function AuditTable({ lines }: { lines: AuditRow[] }) {
  return (
    <DataTable
      columns={columns} data={lines} rowHref={(r) => `/conformite/journal-audit/${r.id}`}
      searchPlaceholder="Rechercher dans le journal…" emptyMessage="Aucune ligne de journal."
    />
  );
}
