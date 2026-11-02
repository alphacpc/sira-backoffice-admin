"use client";

import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { searchEverywhere } from "@/app/(admin)/recherche/actions";
import { Button } from "@/components/ui/button";
import { allNavItems } from "@/lib/nav";
import { filterByQuery, hitsAfterResponse, paletteSections } from "@/lib/palette";
import type { SearchHit } from "@/lib/repos/search";
import { queryProblem } from "@/lib/search-query";

const ITEM = "cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent-soft";

export function CommandPalette({ companies }: { companies: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const latest = useRef(0);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Records come from the server after a short pause; a late answer to an older query is dropped.
  useEffect(() => {
    const id = ++latest.current;
    // Hits of the previous text never show under the new text.
    setHits([]);
    if (queryProblem(query) !== null) return;
    const timer = setTimeout(async () => {
      let r: Awaited<ReturnType<typeof searchEverywhere>> | null = null;
      try {
        r = await searchEverywhere(query);
      } catch {
        r = null;
      }
      setHits((cur) => hitsAfterResponse(cur, id, latest.current, r));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function changeOpen(o: boolean) {
    setOpen(o);
    if (!o) {
      setQuery("");
      setHits([]);
    }
  }

  function go(href: string) {
    changeOpen(false);
    router.push(href);
  }

  const pages = filterByQuery(allNavItems(), query, (i) => i.label);
  const matchingCompanies = filterByQuery(companies, query, (c) => c.name);
  const trimmed = query.trim();
  const canSearchAll = queryProblem(query) === null;
  const nothing = pages.length === 0 && matchingCompanies.length === 0 && hits.length === 0 && !canSearchAll;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} aria-label="Ouvrir la recherche">
        <Search size={14} />
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="hidden rounded bg-muted px-1.5 text-[10px] sm:inline">⌘K</kbd>
      </Button>
      <Command.Dialog
        open={open} onOpenChange={changeOpen} label="Palette de commandes" shouldFilter={false}
        className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-card border border-border bg-card shadow-card"
      >
        <Command.Input
          value={query} onValueChange={setQuery}
          placeholder="Aller à une page ou une compagnie…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          {nothing && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun résultat</p>}
          {pages.length > 0 && (
            <Command.Group heading="Pages" className="text-xs text-muted-foreground">
              {pages.map((i) => (
                <Command.Item key={i.href} value={`page ${i.href}`} onSelect={() => go(i.href)} className={ITEM}>
                  {i.label}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {matchingCompanies.length > 0 && (
            <Command.Group heading="Compagnies" className="text-xs text-muted-foreground">
              {matchingCompanies.map((c) => (
                <Command.Item key={c.id} value={`compagnie ${c.id}`} onSelect={() => go(`/compagnies/${c.id}`)} className={ITEM}>
                  {c.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {hits.length > 0 && (
            <Command.Group heading="Enregistrements" className="text-xs text-muted-foreground">
              {hits.map((h) => (
                <Command.Item key={`${h.type}-${h.id}`} value={`${h.type} ${h.id}`} onSelect={() => go(h.href)} className={ITEM}>
                  <span className="font-medium">{h.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{h.sublabel}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {canSearchAll && (
            <Command.Group heading="Recherche" className="text-xs text-muted-foreground">
              <Command.Item
                value={`tous ${trimmed}`} onSelect={() => go(`/recherche?q=${encodeURIComponent(trimmed)}`)} className={ITEM}
              >
                Voir tous les résultats pour « {trimmed} »
              </Command.Item>
            </Command.Group>
          )}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
