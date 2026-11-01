export default function PhonePreview() {
  const seats = Array.from({ length: 20 }, (_, i) => i);
  const taken = new Set([2, 5, 11, 16]);

  return (
    <div className="mx-auto w-64 rounded-[2.4rem] border border-primary/10 bg-primary-deep p-2.5 shadow-[0_32px_80px_-32px_rgb(13_18_38/0.45)] sm:w-72">
      <div className="rounded-[2rem] bg-white p-4">
        {/* Encoche */}
        <div className="mx-auto mb-4 h-4 w-20 rounded-full bg-primary-deep" />

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent-dark">
              S
            </span>
            <div className="space-y-1">
              <div className="h-2 w-16 rounded-full bg-primary/80" />
              <div className="h-1.5 w-10 rounded-full bg-primary/20" />
            </div>
          </div>
          <div className="rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-white">
            Réserver
          </div>
        </div>

        {/* Trajet */}
        <div className="mt-4 rounded-xl border border-primary/10 bg-primary/[0.02] p-2.5">
          <svg viewBox="0 0 200 56" className="h-14 w-full">
            <path
              d="M12 44 C 60 40, 90 16, 188 20"
              fill="none"
              stroke="#f5a524"
              strokeWidth="2"
              strokeDasharray="5 5"
              strokeLinecap="round"
            />
            <circle cx="12" cy="44" r="4" fill="#1e2749" />
            <circle cx="188" cy="20" r="4" fill="#f5a524" />
          </svg>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-primary">
              Abidjan → Bouaké
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-primary/50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              En direct
            </span>
          </div>
        </div>

        {/* Sièges */}
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-primary/40">
          Choix du siège
        </p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {seats.map((i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded ${
                taken.has(i)
                  ? "bg-primary/10"
                  : i === 7
                    ? "bg-accent"
                    : "bg-white ring-1 ring-primary/15"
              }`}
            />
          ))}
        </div>

        {/* Billet */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-primary p-3">
          <div>
            <div className="text-[10px] text-white/60">Billet</div>
            <div className="text-xs font-semibold text-white">#SRA-2048</div>
          </div>
          <div className="rounded-md bg-white px-2.5 py-1 text-[10px] font-bold text-primary">
            Vérifier
          </div>
        </div>
      </div>
    </div>
  );
}
