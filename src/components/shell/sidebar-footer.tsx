"use client";

import { Moon, SignOut, Sun } from "@phosphor-icons/react/dist/ssr";
import { useTheme } from "next-themes";
import { logout } from "@/app/(auth)/actions";
import pkg from "../../../package.json";

const SEGMENT =
  "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-sidebar-muted transition-colors hover:text-sidebar-foreground";

export function SidebarFooter({ collapsed = false }: { collapsed?: boolean }) {
  const { setTheme, resolvedTheme } = useTheme();
  if (collapsed) {
    return (
      <div className="space-y-2 border-t border-sidebar-border px-3 py-4">
        <button
          type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Basculer le thème clair ou sombre" title="Basculer le thème"
          className="flex h-10 w-full items-center justify-center rounded-lg bg-sidebar-hover text-sidebar-foreground hover:bg-sidebar-active"
        >
          <Sun size={18} aria-hidden className="hidden dark:block" />
          <Moon size={18} aria-hidden className="dark:hidden" />
        </button>
        <form action={logout}>
          <button
            type="submit" aria-label="Se déconnecter" title="Se déconnecter"
            className="flex h-10 w-full items-center justify-center rounded-lg text-danger transition-colors hover:bg-danger/10"
          >
            <SignOut size={18} aria-hidden />
          </button>
        </form>
      </div>
    );
  }
  return (
    <div className="space-y-3 border-t border-sidebar-border px-4 py-4">
      <div role="group" aria-label="Thème" className="flex gap-1 rounded-xl bg-sidebar-hover p-1">
        <button
          type="button" onClick={() => setTheme("light")} aria-label="Thème clair"
          className={`${SEGMENT} [:root:not(.dark)_&]:bg-sidebar-active [:root:not(.dark)_&]:text-sidebar-foreground`}
        >
          <Sun size={16} aria-hidden /> Light
        </button>
        <button
          type="button" onClick={() => setTheme("dark")} aria-label="Thème sombre"
          className={`${SEGMENT} dark:bg-sidebar-active dark:text-sidebar-foreground`}
        >
          <Moon size={16} aria-hidden /> Dark
        </button>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
        >
          <SignOut size={18} aria-hidden /> Se déconnecter
        </button>
      </form>
      <div className="rounded-xl border border-sidebar-border bg-sidebar-hover/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            Sira Backoffice
          </p>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-text">
            v{pkg.version}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-sidebar-muted">
          Console d&apos;administration de la plateforme de transport.
        </p>
      </div>
    </div>
  );
}
