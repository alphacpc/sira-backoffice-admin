"use client";

import { CaretDown, Check } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string> { value: T; label: string }

/** Controlled dropdown (button + listbox popover). */
export function SelectMenu<T extends string>({
  label, value, options, onChange, className,
}: { label: string; value: T; options: SelectOption<T>[]; onChange: (value: T) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0]!;

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 items-center justify-between gap-3 rounded-xl border bg-card px-3.5 text-sm shadow-card transition-colors hover:bg-muted",
          open ? "border-accent ring-2 ring-accent/25" : "border-border",
        )}
      >
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{selected.label}</span>
        </span>
        <CaretDown size={14} aria-hidden className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label={label} className="absolute left-0 z-30 mt-2 min-w-full overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg">
          {options.map((o) => {
            const on = o.value === selected.value;
            return (
              <li key={o.value} role="option" aria-selected={on}>
                <button
                  type="button" onClick={() => { setOpen(false); onChange(o.value); }}
                  className={cn("flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors", on ? "bg-accent-soft font-medium" : "hover:bg-muted")}
                >
                  <Check size={14} aria-hidden className={on ? "text-accent-text" : "opacity-0"} />
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
