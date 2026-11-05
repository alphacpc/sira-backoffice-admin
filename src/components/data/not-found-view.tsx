import { Buildings, Bus, MagnifyingGlass, Package, Pulse, Receipt, House } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

/** The "0" of 404 as a bus wheel: tyre, spokes, amber hub. */
function Wheel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("nf-wheel", className)}>
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="14" />
      {[0, 60, 120].map((a) => <line key={a} x1="50" y1="14" x2="50" y2="86" stroke="currentColor" strokeWidth="5" strokeLinecap="round" transform={`rotate(${a} 50 50)`} />)}
      <circle cx="50" cy="50" r="11" fill="var(--accent)" />
      <circle cx="50" cy="50" r="4" fill="var(--background)" />
    </svg>
  );
}

function BigNumber({ small }: { small?: boolean }) {
  const digit = cn("font-extrabold leading-none tracking-tighter text-foreground", small ? "text-7xl" : "text-[9rem] sm:text-[12rem]");
  return (
    <p role="img" aria-label="Erreur 404" className={cn("flex items-center justify-center", small ? "gap-1" : "gap-1 sm:gap-2")}>
      <span aria-hidden className={digit}>4</span>
      <Wheel className={cn("text-foreground", small ? "size-[4.4rem]" : "size-[8.2rem] sm:size-[11rem]")} />
      <span aria-hidden className={digit}>4</span>
    </p>
  );
}

/** A line with stops: the user's last known stop, then the one that does not exist. */
function RouteStrip({ from }: { from: string }) {
  return (
    <div aria-hidden className="mx-auto mt-8 flex max-w-md items-center gap-2 text-xs font-medium text-muted-foreground">
      <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-foreground" />{from}</span>
      <span className="h-0 flex-1 border-t-2 border-dashed border-border" />
      <Bus size={20} weight="duotone" className="text-accent-text" />
      <span className="h-0 w-8 border-t-2 border-dashed border-border" />
      <span className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full border-2 border-dashed border-accent-text text-[10px] font-bold text-accent-text">?</span>Arrêt inconnu</span>
    </div>
  );
}

const SHORTCUTS: { href: string; label: string; icon: ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean }> }[] = [
  { href: "/compagnies", label: "Compagnies", icon: Buildings }, { href: "/flotte", label: "Flotte", icon: Bus },
  { href: "/ventes", label: "Ventes", icon: Receipt }, { href: "/colis-clients", label: "Colis et clients", icon: Package },
  { href: "/supervision", label: "Supervision", icon: Pulse },
];

export interface NotFoundViewProps {
  title?: string; description?: string;
  /** Where the primary button goes, with its label. Defaults to the dashboard. */
  backHref?: string; backLabel?: string;
  /** Full page (outside the app shell) or inside the page area. */
  variant?: "page" | "inline";
  /** Big numerals even inside the app shell (unknown address rather than a missing item). */
  large?: boolean;
}

export function NotFoundView({
  title = "Cette page n'existe pas", description = "L'adresse a peut-être changé ou contient une faute. Reprenez la ligne depuis un point connu.",
  backHref = "/", backLabel = "Retour au tableau de bord", variant = "page", large = false,
}: NotFoundViewProps) {
  const inline = variant === "inline";
  const primary = "inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-card transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const ghost = "inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  return (
    <main className={cn("relative flex w-full flex-col justify-center overflow-hidden", inline ? "min-h-[60vh] py-10" : "min-h-screen bg-background px-6 py-12 sm:px-12")}>
      {!inline && (
        <header className="absolute left-6 top-6 sm:left-12 sm:top-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sira-horizontal.svg" alt="Sira" className="h-8 dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sira-horizontal-dark.svg" alt="" aria-hidden className="hidden h-8 dark:block" />
        </header>
      )}
      <div className={cn("mx-auto w-full text-center", inline ? "max-w-3xl" : "max-w-4xl")}>
        <BigNumber small={inline && !large} />
        <h1 className={cn("mt-6 font-extrabold tracking-tight", inline && !large ? "text-2xl" : "text-3xl sm:text-4xl")}>{title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-base text-muted-foreground">{description}</p>
        <RouteStrip from={inline && !large ? "Liste" : "Vous êtes ici"} />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={backHref} className={primary}><House size={18} weight="duotone" aria-hidden />{backLabel}</Link>
          {backHref !== "/" && <Link href="/" className={ghost}>Tableau de bord</Link>}
          <Link href="/recherche" className={ghost}><MagnifyingGlass size={18} aria-hidden />Rechercher</Link>
        </div>
        {!inline && (
          <nav aria-label="Accès rapides" className="mt-10 border-t border-border pt-6">
            <p className="mb-3 text-sm font-semibold text-muted-foreground">Ou allez directement à</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {SHORTCUTS.map(({ href, label, icon: Icon }) => (
                <li key={href}><Link href={href} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"><Icon size={16} weight="duotone" aria-hidden />{label}</Link></li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </main>
  );
}
