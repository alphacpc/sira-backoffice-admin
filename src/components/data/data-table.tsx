"use client";

import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable, type ColumnDef, type SortingState, type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  searchPlaceholder?: string;
  rowHref?: (row: T) => string;
  emptyMessage?: string;
  pageSize?: number;
}

export function DataTable<T>({
  columns, data, searchPlaceholder = "Rechercher…", rowHref,
  emptyMessage = "Aucun résultat", pageSize = 15,
}: DataTableProps<T>) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [visibility, setVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data, columns,
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input
          className="max-w-xs" placeholder={searchPlaceholder} aria-label="Rechercher dans le tableau"
          value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)}
        />
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
            Colonnes
          </summary>
          <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-border bg-card p-2 shadow-card">
            {table.getAllLeafColumns().map((col) => (
              <label key={col.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                <input type="checkbox" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()} />
                {typeof col.columnDef.header === "string" ? col.columnDef.header : col.id}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  return (
                    <th key={h.id} className="px-3 py-2 font-medium">
                      {h.column.getCanSort() ? (
                        <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-foreground">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === "asc" && <ArrowUp size={12} />}
                          {sorted === "desc" && <ArrowDown size={12} />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">{emptyMessage}</td></tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={rowHref ? () => router.push(rowHref(row.original)) : undefined}
                  className={`border-b border-border last:border-0 ${rowHref ? "cursor-pointer hover:bg-muted/50" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{table.getFilteredRowModel().rows.length} résultat(s)</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Page précédente">
            <ChevronLeft size={14} />
          </Button>
          <span>Page {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}</span>
          <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Page suivante">
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
