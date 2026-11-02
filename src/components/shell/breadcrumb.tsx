"use client";

import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isLinkablePath, labelForSegment } from "@/lib/nav";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export function Breadcrumb() {
  const segments = (usePathname() ?? "/").split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    href: "/" + segments.slice(0, i + 1).join("/"),
    label: UUID.test(seg) ? "Fiche" : labelForSegment(seg),
  }));
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-foreground">Accueil</Link>
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          <CaretRight size={12} />
          {i === crumbs.length - 1 ? (
            <span className="text-foreground">{c.label}</span>
          ) : isLinkablePath(c.href) ? (
            <Link href={c.href} className="hover:text-foreground">{c.label}</Link>
          ) : (
            <span>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
