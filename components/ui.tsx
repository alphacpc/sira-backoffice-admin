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
      className={`font-mono text-xs font-semibold uppercase tracking-[0.18em] ${
        tone === "dark" ? "text-amber" : "text-amber-ink"
      }`}
    >
      {children}
    </p>
  );
}

const variants = {
  primary: "bg-navy text-white hover:bg-navy-dark focus-visible:outline-navy",
  accent: "bg-amber text-navy hover:bg-amber-dark focus-visible:outline-navy",
  outline: "border border-navy/30 text-navy hover:border-navy focus-visible:outline-navy",
  "outline-light": "border border-white/40 text-white hover:border-white focus-visible:outline-white",
} as const;

export function Title2({
  lead,
  accent,
  as: Tag = "h2",
  tone = "light",
  className = "",
}: {
  lead: string;
  accent: string;
  as?: "h1" | "h2" | "h3";
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <Tag className={`font-sans font-extrabold leading-[1.05] tracking-tight ${className}`}>
      <span className={tone === "dark" ? "text-white" : "text-navy"}>{lead}</span>{" "}
      <span className={tone === "dark" ? "text-amber" : "text-[#c27800]"}>{accent}</span>
    </Tag>
  );
}

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
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${variants[variant]}`}
    >
      {children}
    </Link>
  );
}
