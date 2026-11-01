export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 520 400"
      className="h-auto w-full"
      role="img"
      aria-label="Illustration d'un bus sur une ligne reliant plusieurs gares"
    >
      <defs>
        <linearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e2749" />
          <stop offset="100%" stopColor="#2c3868" />
        </linearGradient>
      </defs>

      {/* Fond */}
      <rect width="520" height="400" rx="24" fill="url(#heroBg)" />

      {/* Ligne pointillée */}
      <path
        d="M70 320 C 150 300, 240 340, 450 250"
        stroke="#f5a524"
        strokeWidth="3"
        strokeDasharray="8 8"
        fill="none"
        strokeLinecap="round"
      />

      {/* Gares */}
      <g fill="#ffffff">
        <circle cx="70" cy="320" r="7" />
        <circle cx="450" cy="250" r="7" />
      </g>
      <circle cx="260" cy="322" r="9" fill="#f5a524" />

      {/* Étiquettes */}
      <g fill="#c7cbd9" fontSize="13">
        <text x="70" y="345" textAnchor="middle">Départ</text>
        <text x="450" y="275" textAnchor="middle">Arrivée</text>
        <text x="260" y="348" textAnchor="middle" fill="#f5a524">Hub</text>
      </g>

      {/* Bus */}
      <g transform="translate(150 170)">
        {/* Ombre */}
        <ellipse cx="110" cy="150" rx="90" ry="14" fill="#000" opacity="0.18" />
        {/* Caisse */}
        <rect x="10" y="60" width="200" height="78" rx="14" fill="#f5a524" />
        {/* Avant incliné */}
        <path d="M210 60 L250 96 L250 138 L210 138 Z" fill="#f5a524" />
        {/* Fenêtres */}
        <rect x="28" y="76" width="52" height="34" rx="6" fill="#1e2749" />
        <rect x="92" y="76" width="52" height="34" rx="6" fill="#1e2749" />
        <rect x="156" y="76" width="40" height="34" rx="6" fill="#1e2749" />
        {/* Pare-brise */}
        <rect x="214" y="74" width="26" height="40" rx="6" fill="#1e2749" />
        {/* Roues */}
        <circle cx="70" cy="140" r="24" fill="#1e2749" />
        <circle cx="70" cy="140" r="10" fill="#c7cbd9" />
        <circle cx="190" cy="140" r="24" fill="#1e2749" />
        <circle cx="190" cy="140" r="10" fill="#c7cbd9" />
      </g>

      {/* Badges flottants */}
      <g>
        <rect x="330" y="70" width="150" height="54" rx="12" fill="#ffffff" opacity="0.96" />
        <circle cx="358" cy="97" r="12" fill="#1e2749" />
        <text x="358" y="102" textAnchor="middle" fill="#f5a524" fontSize="13" fontWeight="700">
          ✓
        </text>
        <text x="380" y="94" fill="#1e2749" fontSize="13" fontWeight="600">Billet</text>
        <text x="380" y="111" fill="#6b7280" fontSize="12">confirmé</text>
      </g>
      <g>
        <rect x="40" y="60" width="150" height="54" rx="12" fill="#ffffff" opacity="0.96" />
        <circle cx="68" cy="87" r="12" fill="#1e2749" />
        <text x="68" y="92" textAnchor="middle" fill="#f5a524" fontSize="13" fontWeight="700">
          ✓
        </text>
        <text x="90" y="84" fill="#1e2749" fontSize="13" fontWeight="600">Colis</text>
        <text x="90" y="101" fill="#6b7280" fontSize="12">en transit</text>
      </g>
    </svg>
  );
}
