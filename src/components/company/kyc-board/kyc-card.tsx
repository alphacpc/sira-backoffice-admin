import { Clock, DotsSixVertical, Note } from "@phosphor-icons/react/dist/ssr";
import { formatDuration } from "@/lib/format";
import type { KycCard } from "@/lib/repos/companies";
import { cn } from "@/lib/utils";
import { DOC_DOT, DOC_LABEL } from "./stages";

/** Pure card, also rendered inside the drag overlay. */
export function KycCardView({ card, dragging = false }: { card: KycCard; dragging?: boolean }) {
  const late = card.stage !== "approved" && card.stage !== "rejected" && card.ageDays > 14;
  return (
    <div
      className={cn(
        "group rounded-xl border border-border bg-card p-3.5 shadow-card transition-all",
        dragging ? "rotate-2 scale-[1.03] shadow-xl ring-2 ring-accent/50" : "hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ea580c] text-sm font-bold text-white">
          {card.name.trim().slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{card.name}</p>
          <p className="truncate text-xs text-muted-foreground">{card.ownerName ?? "Propriétaire inconnu"}</p>
        </div>
        {card.stage !== "approved" && (
          <DotsSixVertical size={18} aria-hidden className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
        )}
      </div>

      <div className="mt-3.5">
        <div className="flex gap-1" role="img" aria-label={`${card.docsApproved} documents approuvés sur ${card.docsRequired}`}>
          {card.docs.map((d, i) => (
            <span key={i} title={`${d.typeName} · ${DOC_LABEL[d.status]}`} className={cn("h-1.5 flex-1 rounded-full", DOC_DOT[d.status])} />
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span><span className="font-semibold tabular-nums text-foreground">{card.docsApproved}</span> / {card.docsRequired} documents</span>
          <span className={cn("inline-flex items-center gap-1 tabular-nums", late && "font-medium text-danger")}>
            <Clock size={12} aria-hidden />
            {card.stage === "approved" ? `activée il y a ${formatDuration(card.ageDays)}` : formatDuration(card.ageDays)}
          </span>
        </div>
      </div>

      {card.note && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          <Note size={14} aria-hidden className="mt-px shrink-0" />
          <span className="line-clamp-2">{card.note}</span>
        </p>
      )}
    </div>
  );
}
