"use client";

import { Check, CaretDown, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface FilterOption { value: string; label: string; count?: number }

/** Dropdown that sets one URL parameter; the other parameters in `keep` are preserved. */
export function FilterSelect({
  label, param, basePath, current, options, keep = {}, searchable = false,
}: {
  label: string; param: string; basePath: string; current: string;
  options: FilterOption[]; keep?: Record<string, string>;
  /** Adds a search field to the list (for long lists such as companies). */
  searchable?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const fold = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const matching = searchable && filter.trim()
    ? options.filter((o, i) => i === 0 || fold(o.label).includes(fold(filter.trim())))
    : options;
  const shown = searchable ? matching.slice(0, 50) : matching;
  const hidden = matching.length - shown.length;
  const selected = options.find((o) => o.value === current) ?? options[0]!;

  useEffect(() => {
    if (!open) { setFilter(""); return; }
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function choose(value: string) {
    setOpen(false);
    setFilter("");
    const qs = new URLSearchParams(keep);
    if (value !== options[0]!.value) qs.set(param, value);
    const text = qs.toString();
    router.push(text ? `${basePath}?${text}` : basePath);
  }

  return (
    <div ref={root} className="relative inline-block">
      <button
        type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 min-w-52 items-center justify-between gap-3 rounded-xl border bg-card px-3.5 text-sm shadow-card transition-colors hover:bg-muted",
          open ? "border-accent ring-2 ring-accent/25" : "border-border",
        )}
      >
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{selected.label}</span>
        </span>
        <CaretDown size={14} aria-hidden className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 w-full min-w-64 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        {searchable && (
          <div className="relative border-b border-border p-2">
            <MagnifyingGlass size={14} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Rechercher…`} aria-label={`Rechercher dans ${label}`}
              className="h-9 w-full rounded-lg bg-muted/60 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30"
            />
          </div>
        )}
        <ul id={listId} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto p-1">
          {shown.map((o) => {
            const on = o.value === selected.value;
            return (
              <li key={o.value} role="option" aria-selected={on}>
                <button
                  type="button" onClick={() => choose(o.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    on ? "bg-accent-soft font-medium" : "hover:bg-muted",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Check size={14} aria-hidden className={on ? "text-accent-text" : "opacity-0"} />
                    {o.label}
                  </span>
                  {o.count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{o.count}</span>}
                </button>
              </li>
            );
          })}
          {shown.length === 0 && <li className="px-3 py-3 text-center text-sm text-muted-foreground">Aucun résultat</li>}
          {hidden > 0 && <li className="px-3 py-2 text-center text-xs text-muted-foreground">+ {hidden} autre(s) : affine la recherche</li>}
        </ul>
        </div>
      )}
    </div>
  );
}
