"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatNumber } from "@/lib/format";
import type { LoyaltyProgramRow } from "@/lib/repos/clients";

const columns: ColumnDef<LoyaltyProgramRow, unknown>[] = [
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "name", header: "Programme", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  {
    accessorKey: "pointsPerCurrencyUnit", header: "Points par unité",
    cell: ({ row }) => <span className="tabular-nums">{row.original.pointsPerCurrencyUnit}</span>,
  },
  {
    accessorKey: "redemptionRate", header: "Valeur d'un point",
    cell: ({ row }) => <span className="tabular-nums">{row.original.redemptionRate}</span>,
  },
  {
    accessorKey: "minPointsForRedemption", header: "Seuil de conversion",
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.minPointsForRedemption)} pts</span>,
  },
  {
    accessorKey: "status", header: "État",
    cell: ({ row }) => (
      <StatusBadge tone={row.original.status === "ACTIVE" ? "success" : "neutral"}>
        {row.original.status === "ACTIVE" ? "Actif" : "Inactif"}
      </StatusBadge>
    ),
  },
  { accessorKey: "accounts", header: "Comptes", cell: ({ row }) => <span className="tabular-nums">{row.original.accounts}</span> },
  {
    accessorKey: "pointsIssued", header: "Points distribués",
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.pointsIssued)}</span>,
  },
];

export function ProgramsTable({ programs }: { programs: LoyaltyProgramRow[] }) {
  return (
    <DataTable
      columns={columns} data={programs}
      searchPlaceholder="Rechercher un programme…" emptyMessage="Aucun programme de fidélité."
    />
  );
}
