import { seatStateLabel } from "@/lib/labels";
import type { SeatMapView } from "@/lib/repos/fleet";
import { cn } from "@/lib/utils";
import type { SeatState } from "@/lib/types";

/** Colour and symbol of each state: the symbol keeps the map readable without colour. */
const STATE_STYLE: Record<SeatState, { className: string; symbol: string }> = {
  free: { className: "border-success/40 bg-success/10 text-success", symbol: "○" },
  booked: { className: "border-info/40 bg-info/15 text-info", symbol: "◐" },
  occupied: { className: "border-warning/40 bg-warning/20 text-warning", symbol: "●" },
  blocked: { className: "border-border bg-muted text-muted-foreground line-through", symbol: "✕" },
};

const LEGEND: { state: SeatState; label: string }[] = [
  { state: "free", label: "Libre" },
  { state: "booked", label: "Réservé" },
  { state: "occupied", label: "Occupé" },
  { state: "blocked", label: "Bloqué" },
];

/**
 * Server Component: a `rows` × `columns` CSS grid. Each seat carries `data-seat`, `data-state`, an accessible
 * label ("Siège 3B, réservé") and a symbol in addition to its colour; the legend gives the counts.
 */
export function SeatMap({ map }: { map: SeatMapView }) {
  const counts: Record<SeatState, number> = {
    free: map.counts.free, booked: map.counts.booked, occupied: map.counts.occupied, blocked: map.counts.blocked,
  };
  return (
    <div className="space-y-4">
      <ol
        aria-label="Plan de sièges"
        className="grid max-w-xs gap-1.5"
        style={{ gridTemplateColumns: `repeat(${map.columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${map.rows}, auto)` }}
      >
        {map.seats.map((seat) => {
          const style = STATE_STYLE[seat.state];
          return (
            <li
              key={seat.code}
              data-seat={seat.code}
              data-state={seat.state}
              aria-label={`Siège ${seat.code}, ${seatStateLabel(seat.state)}`}
              style={{ gridRow: seat.row, gridColumn: seat.column }}
              className={cn("flex h-9 flex-col items-center justify-center rounded-md border text-[11px] font-medium leading-tight", style.className)}
            >
              <span aria-hidden="true">{style.symbol}</span>
              <span aria-hidden="true">{seat.code}</span>
            </li>
          );
        })}
      </ol>
      <ul aria-label="Légende du plan de sièges" className="flex flex-wrap gap-3 text-sm">
        {LEGEND.map((item) => (
          <li key={item.state} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("inline-flex size-5 items-center justify-center rounded border text-[11px]", STATE_STYLE[item.state].className)}>
              {STATE_STYLE[item.state].symbol}
            </span>
            {item.label} <span className="tabular-nums text-muted-foreground" data-testid={`seat-count-${item.state}`}>({counts[item.state]})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
