const cells = Array.from({ length: 81 }, (_, k) => {
  const i = Math.floor(k / 9);
  const j = k % 9;
  return (i * 7 + j * 13 + i * j) % 3 === 0;
});

export default function TicketMock() {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white shadow-soft">
      <div className="rounded-t-2xl bg-forest px-4 py-3 text-white">
        <p className="text-[11px] uppercase tracking-wider text-white/70">Billet électronique</p>
        <p className="font-serif text-lg">Dakar → Saint-Louis</p>
      </div>
      <dl className="grid grid-cols-3 gap-2 px-4 py-3 text-xs">
        <div><dt className="text-ink/70">Départ</dt><dd className="font-semibold">06:30</dd></div>
        <div><dt className="text-ink/70">Siège</dt><dd className="font-semibold">14</dd></div>
        <div><dt className="text-ink/70">Statut</dt><dd className="font-semibold text-forest">Valide</dd></div>
      </dl>
      <div className="mx-4 border-t border-dashed border-ink/20" />
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[11px] text-ink/70">Code</p>
          <p className="font-mono text-sm font-semibold">BK-EXEMPLE</p>
        </div>
        <div className="grid grid-cols-9 gap-px" aria-hidden="true">
          {cells.map((on, i) => (
            <span key={i} className={`h-1.5 w-1.5 ${on ? "bg-ink" : "bg-transparent"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
