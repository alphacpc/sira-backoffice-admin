"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowRight, Buildings, Bus, CalendarCheck, Clock, Gauge, MapPin, Path, Storefront, UserCircle, Warning, Wrench,
} from "@phosphor-icons/react/dist/ssr";
import { DataTable } from "@/components/data/data-table";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { maintenanceCategoryLabel, vendorKindLabel } from "@/lib/labels";
import type { BusRow, MaintenanceRow, RouteRow, StationRow, TripRow, VendorRow } from "@/lib/repos/fleet";
import { cn } from "@/lib/utils";

const PILL = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";
const TONE = {
  lime: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300",
  zinc: "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200",
} as const;

function Dot({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
  return <span className={cn(PILL, TONE[tone])}><span aria-hidden className="size-1.5 rounded-full bg-current" />{children}</span>;
}
function Company({ name }: { name: string }) {
  return <span className="inline-flex items-center gap-2"><Buildings size={16} weight="duotone" aria-hidden className="shrink-0 text-muted-foreground" />{name}</span>;
}
const Muted = ({ children }: { children: React.ReactNode }) => <span className="text-muted-foreground">{children}</span>;

const BUS_STATUS = { active: ["lime", "En service"], maintenance: ["orange", "Maintenance"], retired: ["zinc", "Hors service"] } as const;
const TRIP_STATUS = { planned: ["sky", "Planifié"], boarding: ["violet", "Embarquement"], departed: ["lime", "Parti"], cancelled: ["rose", "Annulé"] } as const;
const MAINT_STATUS = { PLANNED: ["sky", "Planifiée"], IN_PROGRESS: ["violet", "En cours"], COMPLETED: ["lime", "Terminée"], CANCELLED: ["rose", "Annulée"] } as const;

function Due({ date }: { date: string }) {
  if (!date) return <Muted>—</Muted>;
  const days = Math.round((Date.parse(date) - Date.now()) / 86_400_000);
  const late = days < 0;
  return (
    <div>
      <p className="whitespace-nowrap tabular-nums">{formatDate(date)}</p>
      <p className={cn("text-xs", late ? "font-medium text-danger" : days <= 14 ? "text-orange-600" : "text-muted-foreground")}>
        {late ? `En retard de ${-days} j` : days === 0 ? "Aujourd'hui" : `Dans ${days} j`}
      </p>
    </div>
  );
}

const busColumns: ColumnDef<BusRow, unknown>[] = [
  {
    accessorKey: "plate", header: "Bus",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300"><Bus size={22} weight="duotone" aria-hidden /></span>
        <div className="min-w-0">
          <p className="text-base font-bold tabular-nums">{row.original.plate}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{row.original.busCode}</p>
        </div>
      </div>
    ),
  },
  { accessorKey: "brandModel", header: "Modèle", cell: ({ row }) => <span className="font-medium">{row.original.brandModel}</span> },
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <Company name={row.original.companyName} /> },
  {
    accessorKey: "routeLabel", header: "Affectation",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.routeLabel ?? <Muted>Aucune ligne</Muted>}</p>
        {row.original.fleetName && <p className="text-xs text-muted-foreground">{row.original.fleetName}</p>}
      </div>
    ),
  },
  { accessorKey: "status", header: "Statut", cell: ({ row }) => <Dot tone={BUS_STATUS[row.original.status][0]}>{BUS_STATUS[row.original.status][1]}</Dot> },
  { accessorKey: "seatCapacity", header: "Capacité", cell: ({ row }) => <span className="tabular-nums">{row.original.seatCapacity} places</span> },
  {
    accessorKey: "driverName", header: "Conducteur",
    cell: ({ row }) => (row.original.driverName
      ? <span className="inline-flex items-center gap-2"><UserCircle size={18} weight="duotone" aria-hidden className="text-muted-foreground" />{row.original.driverName}</span>
      : <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600"><Warning size={16} weight="fill" aria-hidden />Non affecté</span>),
  },
  { accessorKey: "nextMaintenanceDate", header: "Prochaine maintenance", cell: ({ row }) => <Due date={row.original.nextMaintenanceDate} /> },
];

export function BusesList({ rows, toolbar }: { rows: BusRow[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={busColumns} data={rows} rowHref={(b) => `/flotte/bus/${b.id}`} searchable={false} toolbar={toolbar} emptyMessage="Aucun bus pour ces critères." />;
}

const tripColumns: ColumnDef<TripRow, unknown>[] = [
  {
    accessorKey: "routeLabel", header: "Trajet",
    cell: ({ row }) => {
      const [from, to] = row.original.routeLabel.split(" → ");
      return (
        <span className="inline-flex items-center gap-2 text-base font-bold">
          {from}<ArrowRight size={16} weight="bold" aria-hidden className="text-accent" />{to}
        </span>
      );
    },
  },
  {
    accessorKey: "departure", header: "Départ",
    cell: ({ row }) => (
      <div>
        <p className="whitespace-nowrap font-medium tabular-nums">{formatDateTime(row.original.departure)}</p>
        <p className="text-xs text-muted-foreground">Arrivée {formatDateTime(row.original.arrival).slice(-5)}</p>
      </div>
    ),
  },
  { accessorKey: "status", header: "Statut", cell: ({ row }) => <Dot tone={TRIP_STATUS[row.original.status][0]}>{TRIP_STATUS[row.original.status][1]}</Dot> },
  {
    accessorKey: "availableSeats", header: "Remplissage",
    cell: ({ row }) => {
      const sold = row.original.totalSeats - row.original.availableSeats;
      const pct = Math.round((sold / Math.max(1, row.original.totalSeats)) * 100);
      return (
        <div className="w-36">
          <div className="flex justify-between text-xs"><span className="tabular-nums font-medium">{sold}/{row.original.totalSeats}</span><span className="tabular-nums text-muted-foreground">{pct} %</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={cn("h-full rounded-full", pct >= 90 ? "bg-rose-500" : pct >= 60 ? "bg-orange-500" : "bg-lime-500")} style={{ width: `${pct}%` }} /></div>
        </div>
      );
    },
  },
  { accessorKey: "price", header: "Prix", cell: ({ row }) => <span className="font-semibold tabular-nums">{formatMoney(row.original.price, row.original.currency)}</span> },
  { accessorKey: "busPlate", header: "Bus", cell: ({ row }) => <span className="inline-flex items-center gap-1.5 font-medium tabular-nums"><Bus size={16} weight="duotone" aria-hidden className="text-muted-foreground" />{row.original.busPlate}</span> },
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <Company name={row.original.companyName} /> },
];

export function TripsList({ rows, toolbar }: { rows: TripRow[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={tripColumns} data={rows} rowHref={(t) => `/flotte/trajets/${t.id}`} searchable={false} toolbar={toolbar} emptyMessage="Aucun trajet pour ces critères." />;
}

const routeColumns: ColumnDef<RouteRow, unknown>[] = [
  {
    accessorKey: "label", header: "Ligne",
    cell: ({ row }) => {
      const [from, to] = row.original.label.split(" → ");
      return <span className="inline-flex items-center gap-2 text-base font-bold"><Path size={18} weight="duotone" aria-hidden className="text-accent" />{from}<ArrowRight size={14} weight="bold" aria-hidden className="text-muted-foreground" />{to}</span>;
    },
  },
  { accessorKey: "distanceKm", header: "Distance", cell: ({ row }) => <span className="inline-flex items-center gap-1.5 tabular-nums"><Gauge size={16} weight="duotone" aria-hidden className="text-muted-foreground" />{row.original.distanceKm} km</span> },
  {
    accessorKey: "durationMinutes", header: "Durée",
    cell: ({ row }) => <span className="inline-flex items-center gap-1.5 tabular-nums"><Clock size={16} weight="duotone" aria-hidden className="text-muted-foreground" />{Math.floor(row.original.durationMinutes / 60)} h {String(row.original.durationMinutes % 60).padStart(2, "0")}</span>,
  },
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <Company name={row.original.companyName} /> },
  { accessorKey: "status", header: "Statut", cell: ({ row }) => <Dot tone={row.original.status === "active" ? "lime" : "zinc"}>{row.original.status === "active" ? "Active" : "Inactive"}</Dot> },
  { accessorKey: "busCount", header: "Bus", meta: { align: "center" }, cell: ({ row }) => <span className="tabular-nums">{row.original.busCount}</span> },
  { accessorKey: "tripCount", header: "Trajets", meta: { align: "center" }, cell: ({ row }) => <span className="tabular-nums">{row.original.tripCount}</span> },
];

export function RoutesList({ rows, toolbar }: { rows: RouteRow[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={routeColumns} data={rows} rowHref={(r) => `/flotte/lignes/${r.id}`} searchable={false} toolbar={toolbar} emptyMessage="Aucune ligne pour ces critères." />;
}

const stationColumns: ColumnDef<StationRow, unknown>[] = [
  {
    accessorKey: "name", header: "Gare",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300"><MapPin size={22} weight="duotone" aria-hidden /></span>
        <p className="text-base font-bold">{row.original.name}</p>
      </div>
    ),
  },
  { accessorKey: "city", header: "Ville", cell: ({ row }) => <span className="font-medium">{row.original.city}</span> },
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <Company name={row.original.companyName} /> },
  { accessorKey: "routeCount", header: "Lignes desservies", meta: { align: "center" }, cell: ({ row }) => <span className="font-semibold tabular-nums">{row.original.routeCount}</span> },
];

export function StationsList({ rows, toolbar }: { rows: StationRow[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={stationColumns} data={rows} searchable={false} toolbar={toolbar} emptyMessage="Aucune gare pour ces critères." />;
}

const maintenanceColumns: ColumnDef<MaintenanceRow, unknown>[] = [
  {
    accessorKey: "code", header: "Intervention",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300"><Wrench size={22} weight="duotone" aria-hidden /></span>
        <div className="min-w-0">
          <p className="font-semibold">{row.original.type}</p>
          <p className="text-xs text-muted-foreground"><span className="font-mono">{row.original.code}</span> · {maintenanceCategoryLabel(row.original.category)}</p>
        </div>
      </div>
    ),
  },
  { accessorKey: "busPlate", header: "Bus", cell: ({ row }) => <span className="inline-flex items-center gap-1.5 font-bold tabular-nums"><Bus size={16} weight="duotone" aria-hidden className="text-muted-foreground" />{row.original.busPlate}</span> },
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <Company name={row.original.companyName} /> },
  { accessorKey: "vendorName", header: "Fournisseur", cell: ({ row }) => (row.original.vendorName ? <span className="inline-flex items-center gap-1.5"><Storefront size={16} weight="duotone" aria-hidden className="text-muted-foreground" />{row.original.vendorName}</span> : <Muted>Interne</Muted>) },
  { accessorKey: "status", header: "Statut", cell: ({ row }) => <Dot tone={MAINT_STATUS[row.original.status][0]}>{MAINT_STATUS[row.original.status][1]}</Dot> },
  {
    accessorKey: "scheduledDate", header: "Calendrier",
    cell: ({ row }) => (
      <div className="text-sm">
        <p className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums"><CalendarCheck size={14} aria-hidden className="text-muted-foreground" />Prévue le {formatDate(row.original.scheduledDate)}</p>
        {row.original.completedAt && <p className="text-xs text-muted-foreground">Terminée le {formatDate(row.original.completedAt)}</p>}
      </div>
    ),
  },
  {
    accessorKey: "totalCost", header: "Coût",
    cell: ({ row }) => (
      <span className="font-bold tabular-nums" title={`Main d'œuvre ${formatMoney(row.original.laborCost, row.original.currency)} + pièces ${formatMoney(row.original.partsCost, row.original.currency)}`}>
        {formatMoney(row.original.totalCost, row.original.currency)}
      </span>
    ),
  },
];

export function MaintenanceList({ rows, toolbar }: { rows: MaintenanceRow[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={maintenanceColumns} data={rows} rowHref={(m) => `/flotte/bus/${m.busId}?onglet=maintenance`} searchable={false} toolbar={toolbar} emptyMessage="Aucune maintenance pour ces critères." />;
}

const KIND_TONE = { GARAGE: "orange", INSURER: "sky", PARTS: "violet", OTHER: "zinc" } as const;
const vendorColumns: ColumnDef<VendorRow, unknown>[] = [
  {
    accessorKey: "name", header: "Fournisseur",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CompanyAvatar name={row.original.name} />
        <p className="text-base font-bold">{row.original.name}</p>
      </div>
    ),
  },
  { accessorKey: "kind", header: "Type", cell: ({ row }) => <Dot tone={KIND_TONE[row.original.kind]}>{vendorKindLabel(row.original.kind)}</Dot> },
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <Company name={row.original.companyName} /> },
  { accessorKey: "interventions", header: "Interventions", meta: { align: "center" }, cell: ({ row }) => <span className="font-semibold tabular-nums">{row.original.interventions}</span> },
  { accessorKey: "totalCost", header: "Coût cumulé", cell: ({ row }) => <span className="font-bold tabular-nums">{formatMoney(row.original.totalCost, row.original.currency)}</span> },
];

export function VendorsList({ rows, toolbar }: { rows: VendorRow[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={vendorColumns} data={rows} searchable={false} toolbar={toolbar} emptyMessage="Aucun fournisseur pour ces critères." />;
}
