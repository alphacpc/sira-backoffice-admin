export default function StoreBadge({
  store,
  tone = "dark",
  className = "",
}: {
  store: "apple" | "google";
  tone?: "dark" | "light";
  className?: string;
}) {
  const isApple = store === "apple";
  const dark = tone === "dark";

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
        dark
          ? "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
          : "border-primary/15 bg-primary/[0.03] hover:border-primary/30 hover:bg-primary/[0.06]"
      } ${className}`}
    >
      <img
        src={
          isApple
            ? "/images/apple-app-store.svg"
            : "/images/Google-Playstore.webp"
        }
        alt={isApple ? "App Store" : "Google Play"}
        className="h-7 w-7 object-contain"
      />
      <div className="leading-tight">
        <p
          className={`text-[11px] uppercase tracking-wide ${
            dark ? "text-white/50" : "text-primary/45"
          }`}
        >
          Bientôt sur
        </p>
        <p
          className={`text-sm font-semibold ${
            dark ? "text-white" : "text-primary"
          }`}
        >
          {isApple ? "App Store" : "Google Play"}
        </p>
      </div>
    </div>
  );
}
