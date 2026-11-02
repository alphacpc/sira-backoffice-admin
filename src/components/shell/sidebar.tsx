"use client";

import {
  ArrowsLeftRight, CaretDoubleLeft, CaretDoubleRight, Bus, CaretDown, ChartLineUp, ChatsCircle, GearSix, Package, ShieldCheck,
  SlidersHorizontal, SquaresFour, Buildings, Receipt, UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/shell/command-palette";
import { Logo, ThemedLogo } from "@/components/shell/logo";
import { iconForHref } from "@/components/shell/nav-icons";
import { SidebarFooter } from "@/components/shell/sidebar-footer";
import { NAV, TOP_ITEMS, type NavIcon } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, typeof Bus> = {
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

export function Sidebar({ companies }: { companies: { id: string; name: string }[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sira-sidebar-collapsed") === "1");
    } catch {}
  }, []);
  function toggle(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem("sira-sidebar-collapsed", next ? "1" : "0");
    } catch {}
  }
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className={cn("space-y-4 pb-3 pt-5", collapsed ? "px-3" : "px-4")}>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-3" : "justify-between")}>
          <Link href="/" aria-label="Sira Backoffice, accueil" className="block">
            {collapsed ? <Logo variant="icon" onDark={false} height={40} className="dark:hidden" /> : <ThemedLogo height={64} />}
            {collapsed && <Logo variant="icon" onDark height={40} className="hidden dark:block" />}
          </Link>
          <button
            type="button" onClick={() => toggle(!collapsed)}
            aria-label={collapsed ? "Agrandir la barre latérale" : "Réduire la barre latérale"}
            title={collapsed ? "Agrandir" : "Réduire"}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
          >
            {collapsed ? <CaretDoubleRight size={16} aria-hidden /> : <CaretDoubleLeft size={16} aria-hidden />}
          </button>
        </div>
        <CommandPalette companies={companies} variant="sidebar" collapsed={collapsed} />
      </div>
      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pb-4">
        {TOP_ITEMS.map(({ item, icon }) => {
          const on = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const TopIcon = icon === "home" ? SquaresFour : icon === "companies" ? Buildings : icon === "billing" ? Receipt : icon === "access" ? UsersThree : icon === "fleet" ? Bus : icon === "sales" ? ArrowsLeftRight : icon === "care" ? Package : icon === "comm" ? ChatsCircle : icon === "compliance" ? ShieldCheck : icon === "monitoring" ? ChartLineUp : GearSix;
          return (
            <Link
              key={item.href} href={item.href} title={item.label}
              aria-current={on ? "page" : undefined}
              className={cn(
                "mb-1 flex h-10 items-center rounded-lg text-sm font-medium",
                collapsed ? "justify-center" : "gap-2.5 px-3",
                on ? "bg-sidebar-active text-sidebar-foreground" : "text-sidebar-foreground hover:bg-sidebar-hover",
              )}
            >
              <TopIcon size={18} weight={on ? "fill" : "duotone"} aria-hidden className={on ? "text-accent" : "text-sidebar-muted"} />
              {!collapsed && item.label}
            </Link>
          );
        })}
        {NAV.map((section) => {
          const active = section.items.some((i) => i.href === pathname);
          const SectionIcon = ICONS[section.icon];
          if (collapsed) {
            return (
              <button
                key={section.label} type="button" onClick={() => toggle(false)}
                title={section.label} aria-label={section.label}
                className={cn(
                  "mb-1 flex h-10 w-full items-center justify-center rounded-lg hover:bg-sidebar-hover",
                  active ? "bg-sidebar-active" : "",
                )}
              >
                <SectionIcon size={20} weight="duotone" aria-hidden className={active ? "text-accent" : "text-sidebar-muted"} />
              </button>
            );
          }
          return (
            <details key={section.label} open={active} className="group mb-1">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-hover">
                <span className="flex items-center gap-2.5">
                  <SectionIcon size={18} weight="duotone" aria-hidden className={active ? "text-accent" : "text-sidebar-muted"} />
                  {section.label}
                </span>
                <CaretDown size={14} aria-hidden className="text-sidebar-muted transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-1 space-y-0.5 pl-4">
                {section.items.map((item) => {
                  const ItemIcon = iconForHref(item.href);
                  return (
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
                      <span className="flex items-center gap-2.5">
                        <ItemIcon size={16} aria-hidden weight={item.href === pathname ? "fill" : "regular"} />
                        {item.label}
                      </span>
                      {!item.implemented && (
                        <span className="rounded bg-sidebar-hover px-1.5 text-[10px] uppercase text-sidebar-muted">bientôt</span>
                      )}
                    </Link>
                  </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </nav>
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
