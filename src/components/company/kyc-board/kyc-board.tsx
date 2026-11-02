"use client";

import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { ArrowCounterClockwise, CaretLeft, CaretRight, MagnifyingGlass, WarningCircle, X } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { fetchKycBoard, moveKycStage } from "@/app/(admin)/compagnies/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { SelectMenu } from "@/components/ui/select-menu";
import { formatNumber } from "@/lib/format";
import {
  KYC_PAGE_SIZE, KYC_STAGES, type KycBoard as Board, type KycBoardQuery, type KycCard, type KycSort,
} from "@/lib/repos/companies";
import type { KycStage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { KycCardView } from "./kyc-card";
import { KycPanel } from "./kyc-panel";
import { STAGE_META } from "./stages";

type Tier = "all" | "STANDARD" | "SILVER" | "GOLD";
interface Filters { q: string; minAge: string; tier: Tier; sort: KycSort }
const DEFAULTS: Filters = { q: "", minAge: "0", tier: "all", sort: "oldest" };

const AGE_OPTIONS = [
  { value: "0", label: "Toutes" }, { value: "7", label: "Plus de 7 jours" },
  { value: "14", label: "Plus de 14 jours" }, { value: "30", label: "Plus de 30 jours" },
];
const TIER_OPTIONS: { value: Tier; label: string }[] = [
  { value: "all", label: "Tous" }, { value: "STANDARD", label: "Standard" }, { value: "SILVER", label: "Silver" }, { value: "GOLD", label: "Gold" },
];
const SORT_OPTIONS: { value: KycSort; label: string }[] = [
  { value: "oldest", label: "Plus anciens d'abord" }, { value: "newest", label: "Plus récents d'abord" },
  { value: "name", label: "Nom A → Z" }, { value: "progress", label: "Plus avancés d'abord" },
];

function DraggableCard({ card, onOpen }: { card: KycCard; onOpen: () => void }) {
  const draggable = card.stage !== "approved";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.companyId, disabled: !draggable });
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners} onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      aria-label={`${card.name}, ${STAGE_META[card.stage].label}`}
      className={cn("touch-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent", draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer", isDragging && "opacity-30")}
    >
      <KycCardView card={card} />
    </div>
  );
}

function Column({
  stage, column, onOpen, onPage,
}: { stage: KycStage; column: Board["columns"][KycStage]; onOpen: (c: KycCard) => void; onPage: (page: number) => void }) {
  const meta = STAGE_META[stage];
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const from = column.total === 0 ? 0 : (column.page - 1) * KYC_PAGE_SIZE + 1;
  const to = Math.min(column.total, column.page * KYC_PAGE_SIZE);
  return (
    <section
      ref={setNodeRef} aria-label={meta.label}
      className={cn("flex h-[calc(100vh-15rem)] min-h-[40rem] flex-col rounded-2xl p-3 transition-all", meta.tint, isOver && `bg-card/60 ring-2 ${meta.ring}`)}
    >
      <header className="mb-3 flex items-center justify-between gap-2 px-1.5 pt-1">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden className={cn("size-2.5 rounded-full", meta.dot)} />
            <span className="truncate">{meta.label}</span>
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta.hint}</p>
        </div>
        <span className="min-w-7 rounded-full bg-card px-2 py-0.5 text-center text-xs font-semibold tabular-nums shadow-card">{formatNumber(column.total)}</span>
      </header>

      <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1 pb-1">
        {column.cards.map((c) => <DraggableCard key={c.companyId} card={c} onOpen={() => onOpen(c)} />)}
        {column.cards.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            Aucun dossier · dépose-en un ici
          </div>
        )}
      </div>

      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 px-1 pt-2.5 text-xs text-muted-foreground">
        <span className="tabular-nums"><span className="font-medium text-foreground">{from}–{to}</span> sur {formatNumber(column.total)}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onPage(column.page - 1)} disabled={column.page <= 1} aria-label={`${meta.label} : page précédente`}
            className="flex size-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted disabled:pointer-events-none disabled:opacity-40">
            <CaretLeft size={12} aria-hidden />
          </button>
          <span className="px-1 tabular-nums">{column.page}/{column.pageCount}</span>
          <button type="button" onClick={() => onPage(column.page + 1)} disabled={column.page >= column.pageCount} aria-label={`${meta.label} : page suivante`}
            className="flex size-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted disabled:pointer-events-none disabled:opacity-40">
            <CaretRight size={12} aria-hidden />
          </button>
        </div>
      </footer>
    </section>
  );
}

export function KycBoard({ board: initial }: { board: Board }) {
  const router = useRouter();
  const [board, setBoard] = useState(initial);
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [pages, setPages] = useState<Partial<Record<KycStage, number>>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ card: KycCard; stage: KycStage } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const first = useRef(true);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const query = useCallback((f: Filters, p: typeof pages): KycBoardQuery => ({
    q: f.q, minAge: Number(f.minAge), tier: f.tier === "all" ? undefined : f.tier, sort: f.sort, pages: p,
  }), []);

  const reload = useCallback((f: Filters, p: typeof pages) => {
    startLoading(async () => {
      const result = await fetchKycBoard(query(f, p));
      if (result.ok) setBoard(result.board);
      else setNotice(result.error);
    });
  }, [query]);

  // Filters, sort and pages are applied by the server; typing is debounced.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => reload(filters, pages), filters.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [filters, pages, reload]);

  // A server refresh (document approved from the panel, for example): reread the current view.
  const seen = useRef(initial);
  useEffect(() => {
    if (seen.current === initial) return;
    seen.current = initial;
    reload(filters, pages);
  }, [initial, filters, pages, reload]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setPages({});
    setFilters((f) => ({ ...f, [key]: value }));
  }
  const dirty = JSON.stringify(filters) !== JSON.stringify(DEFAULTS);

  const allCards = KYC_STAGES.flatMap((s) => board.columns[s].cards);
  const active = allCards.find((c) => c.companyId === activeId) ?? null;
  const open = allCards.find((c) => c.companyId === openId) ?? null;

  async function commit(card: KycCard, stage: KycStage, note?: string) {
    // Optimistic: the card jumps to the top of its new column, the server then confirms.
    setBoard((b) => {
      const columns = { ...b.columns };
      columns[card.stage] = { ...columns[card.stage], total: columns[card.stage].total - 1, cards: columns[card.stage].cards.filter((c) => c.companyId !== card.companyId) };
      columns[stage] = { ...columns[stage], total: columns[stage].total + 1, cards: [{ ...card, stage, note: note ?? null }, ...columns[stage].cards].slice(0, KYC_PAGE_SIZE) };
      return { ...b, columns };
    });
    const result = await moveKycStage(card.companyId, stage, note);
    if (!result.ok) {
      setNotice(result.error);
      reload(filters, pages);
      throw new Error(result.error);
    }
    setNotice(null);
    reload(filters, pages);
    router.refresh();
  }

  function requestMove(card: KycCard, stage: KycStage) {
    if (card.stage === stage) return;
    setNotice(null);
    if (stage === "needs_info" || stage === "rejected") { setPending({ card, stage }); return; }
    commit(card, stage).catch(() => {});
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const card = allCards.find((c) => c.companyId === e.active.id);
    const stage = e.over?.id as KycStage | undefined;
    if (card && stage && KYC_STAGES.includes(stage)) requestMove(card, stage);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1 sm:max-w-sm">
          <MagnifyingGlass size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.q} onChange={(e) => setFilter("q", e.target.value)} placeholder="Compagnie ou propriétaire…"
            aria-label="Rechercher dans le Kanban"
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-9 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          {filters.q && (
            <button type="button" onClick={() => setFilter("q", "")} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
              <X size={14} aria-hidden />
            </button>
          )}
        </div>
        <SelectMenu label="Ancienneté" value={filters.minAge} options={AGE_OPTIONS} onChange={(v) => setFilter("minAge", v)} />
        <SelectMenu label="Palier" value={filters.tier} options={TIER_OPTIONS} onChange={(v) => setFilter("tier", v)} />
        <SelectMenu label="Tri" value={filters.sort} options={SORT_OPTIONS} onChange={(v) => setFilter("sort", v)} />
        {dirty && (
          <button type="button" onClick={() => { setPages({}); setFilters(DEFAULTS); }} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowCounterClockwise size={16} aria-hidden /> Réinitialiser
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          <span className="font-semibold tabular-nums text-foreground">{formatNumber(board.total)}</span> dossier(s)
          {board.late > 0 && (
            <span className="ml-3 inline-flex items-center gap-1 text-danger">
              <WarningCircle size={14} weight="fill" aria-hidden /> {formatNumber(board.late)} en attente depuis plus de 14 jours
            </span>
          )}
        </p>
        <p className="text-xs">Glisse une carte d&apos;une colonne à l&apos;autre, ou clique dessus pour ouvrir le dossier.</p>
      </div>

      {notice && (
        <p role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer" className="shrink-0"><X size={14} aria-hidden /></button>
        </p>
      )}

      <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className={cn("grid auto-cols-[minmax(17.5rem,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4 transition-opacity", loading && "opacity-60")}>
          {KYC_STAGES.map((stage) => (
            <Column
              key={stage} stage={stage} column={board.columns[stage]} onOpen={(c) => setOpenId(c.companyId)}
              onPage={(page) => setPages((p) => ({ ...p, [stage]: page }))}
            />
          ))}
        </div>
        <DragOverlay>{active ? <KycCardView card={active} dragging /> : null}</DragOverlay>
      </DndContext>

      <KycPanel card={open} onClose={() => setOpenId(null)} onMove={(c, s) => { setOpenId(null); requestMove(c, s); }} />

      <ConfirmDialog
        open={!!pending} onOpenChange={(o) => { if (!o) setPending(null); }}
        title={pending?.stage === "rejected" ? `Rejeter le dossier de « ${pending.card.name} »` : `Demander un complément à « ${pending?.card.name ?? ""} »`}
        description={pending?.stage === "rejected" ? "Le motif sera conservé dans l'historique de la compagnie." : "Indique les pièces ou informations attendues."}
        confirmLabel={pending?.stage === "rejected" ? "Rejeter le dossier" : "Demander le complément"}
        destructive={pending?.stage === "rejected"} requireReason
        onConfirm={async (reason) => { if (pending) await commit(pending.card, pending.stage, reason); }}
      />
    </div>
  );
}
