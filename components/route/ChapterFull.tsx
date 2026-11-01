import type { Chapter } from "@/content/solution";

/**
 * Full text of a solution chapter: title, tagline, description, every point
 * and the dashed « À venir » block. Calmer than the home page stops, which
 * only show three points.
 */
export function ChapterFull({ c }: { c: Chapter }) {
  return (
    <div>
      <h2 className="text-3xl font-extrabold leading-[1.08] tracking-tight text-navy sm:text-4xl">
        {c.title}
      </h2>
      <p className="mt-3 text-xl font-semibold leading-snug text-[#8a5200]">{c.tagline}</p>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-ink/75">{c.description}</p>

      <ol className="mt-7 max-w-lg">
        {c.points.map((p, i) => (
          <li key={p} className="flex gap-4 border-t border-navy/10 py-3 text-sm leading-relaxed text-ink/85">
            <span aria-hidden="true" className="w-6 shrink-0 pt-0.5 font-mono text-[11px] font-semibold tracking-[0.1em] text-amber-ink">
              {String(i + 1).padStart(2, "0")}
            </span>
            {p}
          </li>
        ))}
      </ol>

      {c.pending.length > 0 && (
        <div className="relative mt-6 max-w-lg rounded-2xl border-2 border-dashed border-amber-dark/70 bg-amber-soft/50 px-5 py-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-amber-ink">À venir</p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink/80">
            {c.pending.map((p) => (
              <li key={p} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[9px] h-px w-3 shrink-0 bg-amber-ink" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
