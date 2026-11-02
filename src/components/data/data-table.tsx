"use client";

import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable, type ColumnDef, type SortingState, type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowRight, CaretDown, CaretDoubleLeft, CaretDoubleRight, CaretLeft, CaretRight, CaretUp, CaretUpDown,
  Check, MagnifyingGlass, Tray, X,
} from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  searchPlaceholder?: string;
  rowHref?: (row: T) => string;
  /** Stable row identity (TanStack `getRowId`); use it when rows can disappear after an action. */
  rowId?: (row: T) => string;
  emptyMessage?: string;
  pageSize?: number;
  /** Filters shown on the same line as the search field, before it. */
  toolbar?: React.ReactNode;
  /** Hide the built-in search (the page already filters with its own query). */
  searchable?: boolean;
}

const PAGE_SIZES = [10, 15, 25, 50];

/** Pages to show: first, last, and a window around the current one, with "…" for the gaps. */
function pageWindow(current: number, total: number): (number | "gap-left" | "gap-right")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const set = new Set([0, total - 1, current - 1, current, current + 1]);
  if (current <= 2) [1, 2, 3].forEach((n) => set.add(n));
  if (current >= total - 3) [total - 2, total - 3, total - 4].forEach((n) => set.add(n));
  const pages = [...set].filter((n) => n >= 0 && n < total).sort((a, b) => a - b);
  const out: (number | "gap-left" | "gap-right")[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1]! > 1) out.push(i < pages.length / 2 ? "gap-left" : "gap-right");
    out.push(n);
  });
  return out;
}

/** Closes a popover on outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open, close]);
  return ref;
}

const POPOVER_BUTTON =
  "flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium shadow-card transition-colors hover:bg-muted";
const POPOVER_PANEL = "absolute z-30 mt-2 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg";
const ICON_BUTTON =
  "flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

export function DataTable<T>({
  columns, data, searchPlaceholder = "Rechercher…", rowHref, rowId,
  emptyMessage = "Aucun résultat", pageSize = 15, toolbar, searchable = true,
}: DataTableProps<T>) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [sizeOpen, setSizeOpen] = useState(false);
  const sizeRef = useDismiss(sizeOpen, () => setSizeOpen(false));

  const table = useReactTable({
    data, columns,
    ...(rowId ? { getRowId: (row: T) => rowId(row) } : {}),
    state: { sorting, globalFilter, columnVisibility: visibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const { pageIndex, pageSize: size } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const from = total === 0 ? 0 : pageIndex * size + 1;
  const to = Math.min(total, (pageIndex + 1) * size);
  const sizes = PAGE_SIZES.includes(pageSize) ? PAGE_SIZES : [...PAGE_SIZES, pageSize].sort((a, b) => a - b);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {toolbar}
        {searchable && (
        <div className="relative min-w-64 flex-1 sm:max-w-md">
          <MagnifyingGlass size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" placeholder={searchPlaceholder} aria-label="Rechercher dans le tableau"
            value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-9 text-sm shadow-card outline-none transition-shadow placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          {globalFilter && (
            <button
              type="button" onClick={() => setGlobalFilter("")} aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </div>
        )}
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-gradient-to-b from-muted to-muted/60">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const sorted = h.column.getIsSorted();
                    const center = (h.column.columnDef.meta as { align?: string } | undefined)?.align === "center";
                    return (
                      <th
                        key={h.id} scope="col" aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                        className={cn("h-14 whitespace-nowrap px-5 text-xs font-bold uppercase tracking-wider text-foreground/70", center && "text-center")}
                      >
                        {h.column.getCanSort() ? (
                          <button type="button" onClick={h.column.getToggleSortingHandler()} className="group inline-flex items-center gap-2 uppercase tracking-wider transition-colors hover:text-foreground">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {sorted === "asc" ? <CaretUp size={14} weight="bold" aria-hidden className="text-accent-text" />
                              : sorted === "desc" ? <CaretDown size={14} weight="bold" aria-hidden className="text-accent-text" />
                              : <CaretUpDown size={14} aria-hidden className="opacity-40 group-hover:opacity-100" />}
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </th>
                    );
                  })}
                  {rowHref && <th scope="col" className="h-14 w-10"><span className="sr-only">Ouvrir</span></th>}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={table.getVisibleLeafColumns().length + (rowHref ? 1 : 0)} className="px-4 py-14 text-center">
                    <Tray size={36} weight="duotone" aria-hidden className="mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">{emptyMessage}</p>
                    {globalFilter && <p className="mt-1 text-xs text-muted-foreground">Essaie avec d&apos;autres mots-clés.</p>}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={rowHref ? (e) => {
                      if ((e.target as HTMLElement).closest("a,button,input,select,textarea,label,[role=button]")) return;
                      router.push(rowHref(row.original));
                    } : undefined}
                    tabIndex={rowHref ? 0 : undefined}
                    onKeyDown={rowHref ? (e) => {
                      if (e.key === "Enter" && e.target === e.currentTarget) router.push(rowHref(row.original));
                    } : undefined}
                    className={cn("group transition-colors", rowHref && "cursor-pointer hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn("px-4 py-3.5 align-middle", (cell.column.columnDef.meta as { align?: string } | undefined)?.align === "center" && "text-center")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                    {rowHref && (
                      <td className="w-10 pr-4 text-right">
                        <ArrowRight size={14} aria-hidden className="text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            <span className="font-medium tabular-nums text-foreground">{from}–{to}</span> sur{" "}
            <span className="font-medium tabular-nums text-foreground">{total}</span> résultat(s)
          </span>
          <div ref={sizeRef} className="relative">
            <button type="button" aria-haspopup="listbox" aria-expanded={sizeOpen} aria-label="Lignes par page" onClick={() => setSizeOpen((o) => !o)} className={POPOVER_BUTTON}>
              {size} / page <CaretDown size={12} aria-hidden className={cn("transition-transform", sizeOpen && "rotate-180")} />
            </button>
            {sizeOpen && (
              <ul role="listbox" aria-label="Lignes par page" className={cn(POPOVER_PANEL, "bottom-full left-0 mb-2 mt-0 w-32")}>
                {sizes.map((n) => (
                  <li key={n} role="option" aria-selected={n === size}>
                    <button
                      type="button" onClick={() => { table.setPageSize(n); setSizeOpen(false); }}
                      className={cn("flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm hover:bg-muted", n === size && "bg-accent-soft font-medium text-foreground")}
                    >
                      {n} {n === size && <Check size={12} aria-hidden className="text-accent-text" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className={ICON_BUTTON} onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label="Première page">
            <CaretDoubleLeft size={14} aria-hidden />
          </button>
          <button type="button" className={ICON_BUTTON} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Page précédente">
            <CaretLeft size={14} aria-hidden />
          </button>
          <span className="px-2 tabular-nums sm:hidden">Page <span className="font-medium text-foreground">{pageIndex + 1}</span> / {Math.max(table.getPageCount(), 1)}</span>
          <div className="hidden items-center gap-1 sm:flex">
            {pageWindow(pageIndex, table.getPageCount()).map((n) =>
              typeof n === "string" ? (
                <span key={n} aria-hidden className="px-1 text-muted-foreground">…</span>
              ) : (
                <button
                  key={n} type="button" onClick={() => table.setPageIndex(n)}
                  aria-label={`Page ${n + 1}`} aria-current={n === pageIndex ? "page" : undefined}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg text-sm tabular-nums transition-colors",
                    n === pageIndex ? "bg-accent font-semibold text-accent-foreground" : "hover:bg-muted hover:text-foreground",
                  )}
                >
                  {n + 1}
                </button>
              ),
            )}
          </div>
          <button type="button" className={ICON_BUTTON} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Page suivante">
            <CaretRight size={14} aria-hidden />
          </button>
          <button type="button" className={ICON_BUTTON} onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} aria-label="Dernière page">
            <CaretDoubleRight size={14} aria-hidden />
          </button>
          {table.getPageCount() > 7 && (
            <form
              className="ml-2 flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(new FormData(e.currentTarget).get("page"));
                if (Number.isInteger(n) && n >= 1 && n <= table.getPageCount()) table.setPageIndex(n - 1);
                e.currentTarget.reset();
              }}
            >
              <label className="sr-only" htmlFor="goto-page">Aller à la page</label>
              <input
                id="goto-page" name="page" type="number" min={1} max={table.getPageCount()} placeholder="Aller à…"
                className="h-8 w-24 rounded-lg border border-border bg-card px-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
