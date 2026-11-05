import { Armchair, Prohibit, SteeringWheel } from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import { seatStateLabel } from "@/lib/labels";
import type { SeatMapView } from "@/lib/repos/fleet";
import { cn } from "@/lib/utils";
import type { SeatState } from "@/lib/types";

type SeatIcon = ComponentType<{ size?: number; weight?: "regular" | "duotone" | "fill"; "aria-hidden"?: boolean; className?: string }>;

/** Each state differs by icon shape or weight as well as by colour, so the map stays readable without colour. */
const STATE_STYLE: Record<SeatState, { icon: SeatIcon; weight: "regular" | "duotone" | "fill"; tile: string; text: string }> = {
  free: { icon: Armchair, weight: "regular", tile: "border-border bg-card", text: "text-emerald-600" },
  booked: { icon: Armchair, weight: "duotone", tile: "border-orange-300 bg-orange-50", text: "text-orange-500" },
  occupied: { icon: Armchair, weight: "fill", tile: "border-transparent bg-foreground/90", text: "text-background" },
  blocked: { icon: Prohibit, weight: "regular", tile: "border-dashed border-border bg-muted/60", text: "text-muted-foreground" },
};

const LEGEND: { state: SeatState; label: string }[] = [
  { state: "free", label: "Libre" },
  { state: "booked", label: "Réservé" },
  { state: "occupied", label: "Occupé" },
  { state: "blocked", label: "Bloqué" },
];

/**
 * Server Component: the bus seen from above, driver at the top, an aisle in the middle when there are four
 * columns or more. Each seat carries `data-seat`, `data-state` and an accessible label ("Siège 3B, réservé");
 * the legend gives the counts.
 */
export function SeatMap({ map, selected, onSelect }: { map: SeatMapView; selected?: string | null; onSelect?: (code: string) => void }) {
  const counts: Record<SeatState, number> = {
    free: map.counts.free, booked: map.counts.booked, occupied: map.counts.occupied, blocked: map.counts.blocked,
  };
  const aisleAfter = map.columns >= 4 ? Math.floor(map.columns / 2) : 0;
  const colOf = (c: number) => (aisleAfter && c > aisleAfter ? c + 1 : c);
  const template = Array.from({ length: map.columns + (aisleAfter ? 1 : 0) }, (_, i) =>
    aisleAfter && i === aisleAfter ? "0.75rem" : "minmax(0, 1fr)").join(" ");

  return (
    <div className="space-y-4">
      <div className="max-w-sm rounded-[1.75rem] border border-border bg-muted/40 p-4">
        <div className="mb-3 flex items-center justify-between border-b border-dashed border-border pb-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><SteeringWheel size={20} weight="duotone" aria-hidden className="text-orange-500" />Conducteur</span>
          <span>Avant</span>
        </div>
        <ol
          aria-label="Plan de sièges"
          className="grid gap-1.5"
          style={{ gridTemplateColumns: template, gridTemplateRows: `repeat(${map.rows}, auto)` }}
        >
          {map.seats.map((seat) => {
            const st = STATE_STYLE[seat.state];
            const Icon = st.icon;
            const tileClass = cn("flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg border", st.tile, st.text,
              onSelect && "transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-2 focus-visible:outline-orange-500",
              selected === seat.code && "ring-2 ring-orange-500 ring-offset-2 ring-offset-card");
            const content = (
              <>
                <Icon size={22} weight={st.weight} aria-hidden />
                <span aria-hidden className="text-[10px] font-semibold leading-none">{seat.code}</span>
              </>
            );
            return (
              <li
                key={seat.code}
                data-seat={seat.code}
                data-state={seat.state}
                aria-label={`Siège ${seat.code}, ${seatStateLabel(seat.state)}`}
                title={`${seat.code} · ${seatStateLabel(seat.state)}`}
                style={{ gridRow: seat.row, gridColumn: colOf(seat.column) }}
                className={onSelect ? "list-none" : tileClass}
              >
                {onSelect ? (
                  <button type="button" onClick={() => onSelect(seat.code)} aria-pressed={selected === seat.code} className={cn(tileClass, "w-full")}>
                    {content}
                  </button>
                ) : content}
              </li>
            );
          })}
        </ol>
      </div>
      <ul aria-label="Légende du plan de sièges" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {LEGEND.map((item) => {
          const st = STATE_STYLE[item.state];
          const Icon = st.icon;
          return (
            <li key={item.state} className="flex items-center gap-2">
              <span aria-hidden className={cn("flex size-7 items-center justify-center rounded-md border", st.tile, st.text)}>
                <Icon size={16} weight={st.weight} aria-hidden />
              </span>
              {item.label} <span className="tabular-nums text-muted-foreground" data-testid={`seat-count-${item.state}`}>({counts[item.state]})</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
