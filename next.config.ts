import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// 'unsafe-inline' (scripts) est requis par les scripts d'amorçage de Next et de
// next-themes tant qu'aucun nonce n'est en place ; à durcir avant la production.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Fond de carte vectoriel OpenFreeMap (sans clé) : seule origine externe autorisée.
  "img-src 'self' data: blob: https://tiles.openfreemap.org",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "font-src 'self'",
  `connect-src 'self' https://tiles.openfreemap.org${dev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// Les aperçus de documents sont affichés dans un <iframe> de la même origine : seuls ces fichiers acceptent d'être encadrés.
const csp_framable = csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // Les icônes sont importées depuis le point d'entrée « ssr » : sans cette option chaque page compile toute la bibliothèque.
  experimental: { optimizePackageImports: ["@phosphor-icons/react", "@phosphor-icons/react/dist/ssr", "recharts"] },
  async headers() {
    return [
      {
        source: "/kyc-samples/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp_framable },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/((?!kyc-samples/).*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
