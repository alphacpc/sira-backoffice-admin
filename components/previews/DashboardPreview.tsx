export default function DashboardPreview() {
  const nav = [
    "Vue d'ensemble",
    "Flotte",
    "Billetterie",
    "Colis",
    "Ressources humaines",
    "Facturation",
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-[0_32px_80px_-32px_rgb(13_18_38/0.35)]">
      {/* Barre de fenêtre */}
      <div className="flex items-center gap-2 border-b border-primary/10 bg-primary/[0.02] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-primary/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/15" />
        <div className="ml-3 flex h-6 max-w-[220px] flex-1 items-center rounded-md border border-primary/10 bg-white px-3 text-xs text-primary/50">
          app.sira.app
        </div>
      </div>

      <div className="flex">
        {/* Barre latérale */}
        <aside className="hidden w-44 shrink-0 border-r border-primary/10 bg-primary/[0.02] p-3 sm:block">
          <div className="flex items-center gap-2 px-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <span className="h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-sm font-semibold text-primary">Sira</span>
          </div>
          <nav className="mt-5 space-y-1">
            {nav.map((label, i) => (
              <div
                key={label}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  i === 0
                    ? "bg-accent/15 text-primary"
                    : "text-primary/55"
                }`}
              >
                {label}
              </div>
            ))}
          </nav>
        </aside>

        {/* Contenu */}
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-primary">
                Bonjour, Amara
              </div>
              <div className="mt-0.5 text-xs text-primary/50">
                Vue d&apos;ensemble — aujourd&apos;hui
              </div>
            </div>
            <div className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">
              + Nouveau trajet
            </div>
          </div>

          {/* Statistiques */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["Trajets du jour", "24"],
              ["Réservations", "1 204"],
              ["Colis en route", "86"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-primary/10 p-3"
              >
                <div className="text-[11px] text-primary/50">{label}</div>
                <div className="mt-1 text-lg font-bold text-primary">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Graphique */}
          <div className="mt-4 rounded-xl border border-primary/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-primary">
                Revenus — 7 derniers jours
              </div>
              <div className="text-[11px] text-primary/40">FCFA</div>
            </div>
            <svg viewBox="0 0 400 120" className="mt-3 h-28 w-full">
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5a524" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#f5a524" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 90 C 40 78, 70 84, 100 60 S 170 40, 210 52 S 290 20, 330 34 S 380 16, 400 22 L400 120 L0 120 Z"
                fill="url(#area)"
              />
              <path
                d="M0 90 C 40 78, 70 84, 100 60 S 170 40, 210 52 S 290 20, 330 34 S 380 16, 400 22"
                fill="none"
                stroke="#1e2749"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="400" cy="22" r="4" fill="#f5a524" />
            </svg>
          </div>

          {/* Lignes de trajets */}
          <div className="mt-4 space-y-2">
            {[
              ["Abidjan → Bouaké", "07:30", "Départ"],
              ["Bamako → Sikasso", "09:15", "En route"],
              ["Ouaga → Bobo", "12:00", "Planifié"],
            ].map(([route, time, status]) => (
              <div
                key={route}
                className="flex items-center justify-between rounded-lg border border-primary/10 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="text-xs font-medium text-primary">
                    {route}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-primary/50">{time}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      status === "Départ"
                        ? "bg-accent/15 text-accent-dark"
                        : "bg-primary/10 text-primary/60"
                    }`}
                  >
                    {status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
