export default function PhoneMockup() {
  return (
    <svg
      viewBox="0 0 240 300"
      className="mx-auto h-auto w-full max-w-[240px]"
      role="img"
      aria-label="Aperçu de l'application mobile Sira passager"
    >
      {/* Cadre téléphone */}
      <rect x="8" y="4" width="224" height="292" rx="30" fill="#141a36" />
      <rect x="14" y="10" width="212" height="280" rx="24" fill="#ffffff" />

      {/* Encoche */}
      <rect x="90" y="14" width="60" height="12" rx="6" fill="#141a36" />

      {/* En-tête app */}
      <circle cx="34" cy="46" r="8" fill="#f5a524" />
      <rect x="50" y="42" width="70" height="8" rx="4" fill="#1e2749" />
      <rect x="150" y="40" width="44" height="12" rx="6" fill="#f5a524" />

      {/* Carte trajet */}
      <rect x="24" y="66" width="192" height="84" rx="14" fill="#f8f9fc" stroke="#e6e8f0" />
      <rect x="40" y="80" width="90" height="9" rx="4.5" fill="#1e2749" />
      <rect x="40" y="98" width="60" height="7" rx="3.5" fill="#c7cbd9" />
      <rect x="40" y="116" width="140" height="18" rx="9" fill="#f5a524" />
      <circle cx="52" cy="125" r="5" fill="#ffffff" />
      <rect x="64" y="121" width="70" height="8" rx="4" fill="#ffffff" />

      {/* Liste de sièges */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x="24"
            y={166 + i * 30}
            width="192"
            height="22"
            rx="8"
            fill="#ffffff"
            stroke="#e6e8f0"
          />
          <rect x="34" y={173 + i * 30} width="8" height="8" rx="4" fill="#f5a524" />
          <rect x="50" y={171 + i * 30} width="90" height="6" rx="3" fill="#c7cbd9" />
          <rect x="160" y={169 + i * 30} width="42" height="10" rx="5" fill="#eef0f6" />
        </g>
      ))}

      {/* Onglets bas */}
      <rect x="24" y="266" width="192" height="16" rx="8" fill="#eef0f6" />
      <circle cx="52" cy="274" r="5" fill="#f5a524" />
      <circle cx="120" cy="274" r="5" fill="#c7cbd9" />
      <circle cx="188" cy="274" r="5" fill="#c7cbd9" />
    </svg>
  );
}
