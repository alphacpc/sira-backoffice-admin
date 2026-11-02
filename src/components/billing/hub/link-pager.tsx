import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Previous / next links on `?page=`; the other query parameters are kept. */
export function LinkPager({ basePath, page, pageCount, total, size, params }: {
  basePath: string; page: number; pageCount: number; total: number; size: number; params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const href = (n: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    if (n > 1) qs.set("page", String(n));
    const text = qs.toString();
    return text ? `${basePath}?${text}` : basePath;
  };
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  const cls = "flex size-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted";
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
      <span><span className="font-medium tabular-nums text-foreground">{from}–{to}</span> sur {total}</span>
      <div className="flex items-center gap-1.5">
        <Link href={href(page - 1)} aria-label="Page précédente" aria-disabled={page <= 1} className={cn(cls, page <= 1 && "pointer-events-none opacity-40")}><CaretLeft size={14} aria-hidden /></Link>
        <span className="px-2 tabular-nums">Page <span className="font-medium text-foreground">{page}</span> / {pageCount}</span>
        <Link href={href(page + 1)} aria-label="Page suivante" aria-disabled={page >= pageCount} className={cn(cls, page >= pageCount && "pointer-events-none opacity-40")}><CaretRight size={14} aria-hidden /></Link>
      </div>
    </nav>
  );
}
