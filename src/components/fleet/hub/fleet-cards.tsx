import { Armchair, Buildings, Bus, MapPin, TreeStructure } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import type { FleetRow, SeatMapRow } from "@/lib/repos/fleet";

export function FleetsGrid({ fleets }: { fleets: FleetRow[] }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {fleets.map((f) => (
        <li key={f.id} className="flex flex-col rounded-2xl bg-white p-6 shadow-card dark:bg-card">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300"><TreeStructure size={30} weight="duotone" aria-hidden /></span>
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold">{f.name}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground"><Buildings size={14} weight="duotone" aria-hidden />{f.companyName}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted/70 p-4">
            <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Bus size={14} weight="duotone" aria-hidden />Bus</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{f.busCount}</dd></div>
            <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin size={14} weight="duotone" aria-hidden />Dépôt de base</dt><dd className="mt-1 text-base font-semibold">{f.depotName ?? <span className="font-normal text-muted-foreground">Aucun</span>}</dd></div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

export function SeatMapsGrid({ maps }: { maps: SeatMapRow[] }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {maps.map((m) => {
        const blocked = Math.max(0, m.total - m.free - m.booked - m.occupied);
        const seg = (n: number) => `${(n / Math.max(1, m.total)) * 100}%`;
        return (
          <li key={m.id}>
            <Link href={`/flotte/trajets/${m.tripId}`} className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-card dark:bg-card">
              <div className="flex items-start gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300"><Armchair size={26} weight="duotone" aria-hidden /></span>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold">{m.routeLabel}</h3>
                  <p className="text-sm text-muted-foreground">{m.departure ? formatDateTime(m.departure) : "—"}</p>
                </div>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm"><Bus size={16} weight="duotone" aria-hidden className="text-muted-foreground" /><span className="font-bold tabular-nums">{m.busPlate}</span><span className="text-muted-foreground">· {m.companyName}</span></p>
              <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${m.free} libres, ${m.booked} réservés, ${m.occupied} occupés`}>
                <span className="bg-lime-500" style={{ width: seg(m.free) }} /><span className="bg-orange-400" style={{ width: seg(m.booked) }} /><span className="bg-rose-500" style={{ width: seg(m.occupied) }} />
                {blocked > 0 && <span className="bg-zinc-400" style={{ width: seg(blocked) }} />}
              </div>
              <ul className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
                {[["Sièges", m.total, "bg-muted-foreground"], ["Libres", m.free, "bg-lime-500"], ["Réservés", m.booked, "bg-orange-400"], ["Occupés", m.occupied, "bg-rose-500"]].map(([label, n, dot]) => (
                  <li key={label as string}><p className="text-lg font-bold tabular-nums text-foreground">{n as number}</p><p className="flex items-center justify-center gap-1"><span className={`size-1.5 rounded-full ${dot}`} aria-hidden />{label as string}</p></li>
                ))}
              </ul>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
