import Link from "next/link";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export interface LinkTab {
  key: string; label: string; href: string; count?: number;
  /** Draws a separator before this tab (to group tabs). */
  divider?: boolean;
  /** Highlights the count (e.g. work waiting for a review). */
  urgent?: boolean;
  icon: ComponentType<{ size?: number; weight?: "duotone" | "fill"; "aria-hidden"?: boolean; className?: string }>;
}

/** Segmented tabs rendered as links: the active view lives in the URL. */
export function LinkTabs({ tabs, active, label }: { tabs: LinkTab[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-border bg-muted/70 p-1">
      {tabs.map((t) => {
        const on = t.key === active;
        const Icon = t.icon;
        return (
          <div key={t.key} className="flex items-center gap-1">
          {t.divider && <span aria-hidden className="mx-1 h-6 w-px bg-border" />}
          <Link href={t.href} aria-current={on ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
              on
                ? "bg-card text-foreground shadow-card ring-1 ring-border"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <Icon size={18} weight={on ? "fill" : "duotone"} aria-hidden className={on ? "text-accent" : undefined} />
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
                  t.urgent && t.count > 0 ? "bg-warning/15 text-warning" : on ? "bg-accent-soft text-accent-text" : "bg-card text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            )}
          </Link>
          </div>
        );
      })}
    </nav>
  );
}
