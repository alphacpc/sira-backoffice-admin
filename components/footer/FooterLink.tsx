import Link from "next/link";
import type { ReactNode } from "react";

/** Lien de pied de page : au survol, un tiret ambre de 6 px glisse devant le texte. */
export function FooterLink({
  href,
  children,
  code,
  small = false,
}: {
  href: string;
  children: ReactNode;
  code?: string;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative inline-flex items-baseline gap-2.5 rounded-sm text-white/70 transition-colors hover:text-white focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber ${
        small ? "font-mono text-xs" : "text-sm"
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-1/2 h-px w-1.5 origin-left -translate-y-1/2 scale-x-0 bg-amber transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
      />
      <span className="inline-flex items-baseline gap-2.5 transition-transform duration-300 ease-out group-hover:translate-x-3 group-focus-visible:translate-x-3 motion-reduce:transform-none">
        {code && (
          <span aria-hidden="true" className="w-8 font-mono text-[11px] font-semibold tracking-[0.12em] text-amber">
            {code}
          </span>
        )}
        <span>{children}</span>
      </span>
    </Link>
  );
}
