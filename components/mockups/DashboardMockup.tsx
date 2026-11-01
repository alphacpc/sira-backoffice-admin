export default function DashboardMockup() {
  return (
    <svg
      viewBox="0 0 480 320"
      className="h-auto w-full"
      role="img"
      aria-label="Aperçu du tableau de bord Sira : trajets, réservations et statistiques"
    >
      {/* Fenêtre */}
      <rect
        x="1"
        y="1"
        width="478"
        height="318"
        rx="14"
        fill="#ffffff"
        stroke="#e6e8f0"
      />

      {/* Barre latérale */}
      <path
        d="M1 15 A14 14 0 0 1 15 1 L120 1 L120 319 L15 319 A14 14 0 0 1 1 305 Z"
        fill="#141a36"
      />
      <circle cx="28" cy="30" r="7" fill="#f5a524" />
      <rect x="42" y="25" width="46" height="10" rx="5" fill="#ffffff" opacity="0.9" />
      {["#f5a524", "#ffffff", "#ffffff", "#ffffff"].map((c, i) => (
        <rect
          key={i}
          x="16"
          y={58 + i * 34}
          width="88"
          height="14"
          rx="7"
          fill={c}
          opacity={c === "#ffffff" ? 0.18 : 0.95}
        />
      ))}

      {/* Barre supérieure */}
      <rect x="120" y="1" width="359" height="40" fill="#f8f9fc" />
      <rect x="140" y="12" width="90" height="8" rx="4" fill="#1e2749" />
      <rect x="320" y="8" width="140" height="26" rx="13" fill="#eef0f6" />
      <circle cx="352" cy="21" r="6" fill="#c7cbd9" />

      {/* Cartes de stats */}
      {[142, 262, 382].map((x) => (
        <g key={x}>
          <rect
            x={x}
            y="60"
            width="104"
            height="64"
            rx="10"
            fill="#ffffff"
            stroke="#e6e8f0"
          />
          <rect x={x + 12} y="74" width="34" height="8" rx="4" fill="#c7cbd9" />
          <rect x={x + 12} y="92" width="56" height="12" rx="4" fill="#1e2749" />
        </g>
      ))}

      {/* Graphique */}
      <rect
        x="142"
        y="140"
        width="316"
        height="108"
        rx="10"
        fill="#ffffff"
        stroke="#e6e8f0"
      />
      <polyline
        points="158,222 190,196 222,208 254,180 286,188 318,160 350,170 382,146 414,150 442,132"
        fill="none"
        stroke="#f5a524"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="158,222 190,196 222,208 254,180 286,188 318,160 350,170 382,146 414,150 442,132 442,232 158,232"
        fill="#f5a524"
        opacity="0.1"
      />

      {/* Liste de trajets */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx="158" cy={272 + i * 16} r="4" fill="#f5a524" />
          <rect
            x="172"
            y={268 + i * 16}
            width={190 - i * 24}
            height="8"
            rx="4"
            fill="#e6e8f0"
          />
          <rect x="392" y={268 + i * 16} width="52" height="8" rx="4" fill="#c7cbd9" />
        </g>
      ))}
    </svg>
  );
}
