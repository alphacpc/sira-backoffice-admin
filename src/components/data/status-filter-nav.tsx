import Link from "next/link";
import { filterHref } from "@/lib/filters";
import { cn } from "@/lib/utils";

export interface FilterOption { value: string; label: string }

/**
 * Pill links that set `?<param>=` (default `statut`) on a list page; the option "all" clears the
 * filter. `keep` carries the other active filters of the page.
 */
export function StatusFilterNav({
  basePath, options, current, label = "Filtrer par statut", param = "statut", keep,
}: {
  basePath: string;
  options: FilterOption[];
  current: string | undefined;
  label?: string;
  param?: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <nav aria-label={label} className="mb-4 flex flex-wrap gap-2">
      {options.map((o) => {
        const active = (o.value === "all" && !current) || o.value === current;
        return (
          <Link
            key={o.value}
            href={filterHref(basePath, param, o.value, keep)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              active ? "border-accent bg-accent-soft font-medium" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
