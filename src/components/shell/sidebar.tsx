"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-card md:block">
      <div className="px-5 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Sira <span className="text-accent">Backoffice</span>
        </Link>
      </div>
      <nav aria-label="Navigation principale" className="px-3 pb-6">
        {NAV.map((section) => {
          const active = section.items.some((i) => i.href === pathname);
          return (
            <details key={section.label} open={active || section.label === "Vue 360" || section.label === "Compagnies"} className="group mb-1">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                {section.label}
                <ChevronDown size={14} className="text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-1 space-y-0.5 pl-2">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={item.href === pathname ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm",
                        item.href === pathname
                          ? "bg-accent-soft font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {item.label}
                      {!item.implemented && (
                        <span className="rounded bg-muted px-1.5 text-[10px] uppercase text-muted-foreground">bientôt</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </nav>
    </aside>
  );
}
