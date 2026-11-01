const taken = new Set([2, 3, 7, 10, 11, 15, 18, 22, 23, 29, 30, 34]);

function Seat({ n, selected }: { n: number; selected: number }) {
  const isTaken = taken.has(n);
  const isSel = n === selected;
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-medium ${
        isSel
          ? "bg-accent text-ink ring-2 ring-accent-dark"
          : isTaken
            ? "bg-ink/15 text-ink/70 line-through"
            : "border border-ink/20 bg-white text-ink/70"
      }`}
    >
      {n}
    </span>
  );
}

export default function SeatMapMock({
  selected = 14,
  rows = 9,
}: {
  selected?: number;
  rows?: number;
}) {
  return (
    <div className="mx-auto w-fit" role="img" aria-label={`Plan de sièges, siège ${selected} sélectionné`}>
      <div className="mb-2 flex justify-end text-[10px] text-ink/70">Chauffeur ▸</div>
      <div className="space-y-1.5 rounded-2xl border border-ink/15 bg-white p-3">
        {Array.from({ length: rows }, (_, r) => {
          const base = r * 4;
          return (
            <div key={r} className="flex items-center gap-1.5">
              <Seat n={base + 1} selected={selected} />
              <Seat n={base + 2} selected={selected} />
              <span className="w-4" aria-hidden="true" />
              <Seat n={base + 3} selected={selected} />
              <Seat n={base + 4} selected={selected} />
            </div>
          );
        })}
      </div>
      <ul className="mt-3 flex justify-center gap-3 text-[10px] text-ink/70">
        <li className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-ink/20 bg-white" />Libre</li>
        <li className="flex items-center gap-1"><span aria-hidden="true" className="relative h-3 w-3 rounded bg-ink/15"><span className="absolute left-0 right-0 top-1/2 h-px bg-ink/70" /></span>Pris</li>
        <li className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-accent" />Choisi</li>
      </ul>
    </div>
  );
}
