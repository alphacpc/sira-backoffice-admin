"use client";

import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { allNavItems } from "@/lib/nav";

export function CommandPalette({ companies }: { companies: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
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

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} aria-label="Ouvrir la recherche">
        <Search size={14} />
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="hidden rounded bg-muted px-1.5 text-[10px] sm:inline">⌘K</kbd>
      </Button>
      <Command.Dialog
        open={open} onOpenChange={setOpen} label="Palette de commandes"
        className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-card border border-border bg-card shadow-card"
      >
        <Command.Input placeholder="Aller à une page ou une compagnie…" className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none" />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun résultat</Command.Empty>
          <Command.Group heading="Pages" className="text-xs text-muted-foreground">
            {allNavItems().map((i) => (
              <Command.Item key={i.href} value={`page ${i.label}`} onSelect={() => go(i.href)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent-soft">
                {i.label}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Compagnies" className="text-xs text-muted-foreground">
            {companies.map((c) => (
              <Command.Item key={c.id} value={`compagnie ${c.name}`} onSelect={() => go(`/compagnies/${c.id}`)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent-soft">
                {c.name}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
