import Link from "next/link";

export default function Logo({
  height = 32,
  variant = "light",
  className = "",
}: {
  height?: number;
  /** "light" = texte foncé (fond clair) · "dark" = texte blanc (fond sombre) */
  variant?: "light" | "dark";
  className?: string;
}) {
  const src =
    variant === "dark"
      ? "/images/sira-horizontal-dark.svg"
      : "/images/sira-horizontal.svg";

  return (
    <Link href="/" className={`inline-flex items-center ${className}`}>
      <img
        src={src}
        alt="Sira"
        height={height}
        width={(height * 420) / 120}
        className="h-auto w-auto"
        style={{ height }}
      />
    </Link>
  );
}
