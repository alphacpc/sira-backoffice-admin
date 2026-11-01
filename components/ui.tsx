import Link from "next/link";
import type { ReactNode } from "react";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto ${/(^|\s)max-w-/.test(className) ? "" : "max-w-6xl"} px-6 ${className}`}>{children}</div>;
}

export function Eyebrow({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <p
      className={`text-sm font-semibold uppercase tracking-[0.14em] ${
        tone === "dark" ? "text-accent" : "text-accent-ink"
      }`}
    >
      {children}
    </p>
  );
}

const variants = {
  primary: "bg-forest text-white hover:bg-forest-deep",
  accent: "bg-accent text-ink hover:bg-accent-dark",
  outline: "border border-ink/25 text-ink hover:border-ink/60",
  "outline-light": "border border-white/30 text-white hover:border-white/70",
} as const;

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${variants[variant]}`}
    >
      {children}
    </Link>
  );
}
