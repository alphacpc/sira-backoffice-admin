"use client";

import {
  ArrowsLeftRight, Bus, CaretDown, ChartLineUp, ChatsCircle, Package, ShieldCheck,
  SlidersHorizontal, SquaresFour, Buildings, Receipt, UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shell/logo";
import { NAV, type NavIcon } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, typeof Bus> = {
  overview: SquaresFour,
  companies: Buildings,
  billing: Receipt,
  access: UsersThree,
  fleet: Bus,
  sales: ArrowsLeftRight,
  parcels: Package,
  communication: ChatsCircle,
  compliance: ShieldCheck,
  monitoring: ChartLineUp,
  settings: SlidersHorizontal,
};

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block">
      <div className="px-5 py-5">
        <Link href="/" aria-label="Sira Backoffice, accueil">
          <Logo onDark height={30} />
        </Link>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-sidebar-muted">Backoffice</p>
      </div>
      <nav aria-label="Navigation principale" className="px-3 pb-6">
        {NAV.map((section) => {
          const active = section.items.some((i) => i.href === pathname);
          const SectionIcon = ICONS[section.icon];
          return (
            <details key={section.label} open={active || section.label === "Vue 360" || section.label === "Compagnies"} className="group mb-1">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-hover">
                <span className="flex items-center gap-2.5">
                  <SectionIcon size={18} weight="duotone" aria-hidden className={active ? "text-accent" : "text-sidebar-muted"} />
                  {section.label}
                </span>
                <CaretDown size={14} aria-hidden className="text-sidebar-muted transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-1 space-y-0.5 pl-4">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={item.href === pathname ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-lg border-l-2 px-3 py-1.5 text-sm",
                        item.href === pathname
                          ? "border-accent bg-sidebar-active font-medium text-sidebar-foreground"
                          : "border-transparent text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
                      )}
                    >
                      {item.label}
                      {!item.implemented && (
                        <span className="rounded bg-sidebar-hover px-1.5 text-[10px] uppercase text-sidebar-muted">bientôt</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </nav>
    </aside>
  );
}
