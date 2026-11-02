"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { impactScopeLabel, incidentStatusBadge, severityBadge } from "@/lib/labels";
import type { IncidentRow } from "@/lib/repos/monitoring";

const columns: ColumnDef<IncidentRow, unknown>[] = [
  { accessorKey: "incidentCode", header: "Code", cell: ({ row }) => <span className="font-medium">{row.original.incidentCode}</span> },
  { accessorKey: "title", header: "Titre" },
  { accessorKey: "serviceName", header: "Service" },
  {
    accessorKey: "severity", header: "Gravité",
    cell: ({ row }) => {
      const b = severityBadge(row.original.severity);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = incidentStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    id: "scope", header: "Portée", accessorFn: (r) => `${impactScopeLabel(r.impactScope)} ${r.companyName ?? ""}`,
    cell: ({ row }) => (
      <span>{impactScopeLabel(row.original.impactScope)}{row.original.companyName ? ` · ${row.original.companyName}` : ""}</span>
    ),
  },
  { accessorKey: "detectedAt", header: "Détecté le", cell: ({ row }) => formatDateTime(row.original.detectedAt) },
  { accessorKey: "resolvedAt", header: "Résolu le", cell: ({ row }) => (row.original.resolvedAt ? formatDateTime(row.original.resolvedAt) : "—") },
];

export function IncidentsTable({ incidents }: { incidents: IncidentRow[] }) {
  return (
    <DataTable
      columns={columns} data={incidents} rowHref={(r) => `/supervision/incidents/${r.id}`}
      searchPlaceholder="Rechercher un incident…" emptyMessage="Aucun incident."
    />
  );
}
