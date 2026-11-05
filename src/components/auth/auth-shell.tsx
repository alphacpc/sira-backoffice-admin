import { ChartLineUp, ShieldCheck, Stack } from "@phosphor-icons/react/dist/ssr";
import { ThemedLogo } from "@/components/shell/logo";
import { cn } from "@/lib/utils";

export type AuthPanel = "cadre" | "bande" | "plein";
export const AUTH_PANELS: AuthPanel[] = ["cadre", "bande", "plein"];

const MAP = "/images/carte-afrique-1500.png";
const SAND = "bg-[#f4efe4]";
const POINTS = [
  { icon: Stack, text: "Toutes les compagnies, la flotte et les ventes dans une seule console" },
  { icon: ChartLineUp, text: "Un suivi en direct des réservations, des paiements et des colis" },
  { icon: ShieldCheck, text: "Un accès protégé par mot de passe et vérification en deux étapes" },
];
const COUNTRIES = [
  { country: "Sénégal", city: "Dakar" }, { country: "Guinée", city: "Conakry" }, { country: "Côte d'Ivoire", city: "Abidjan" },
];

/** Entrance delay for the n-th element of the page. */
const rise = (n: number, base = 0.15): React.CSSProperties => ({ animationDelay: `${(base + n * 0.08).toFixed(2)}s` });

function Points() {
  return (
    <ul className="space-y-3.5">
      {POINTS.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-start gap-3 text-[15px] text-[#0a2a47]/85">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[#0a2a47]/10"><Icon size={18} weight="duotone" aria-hidden className="text-[#8a5300]" /></span>
          {text}
        </li>
      ))}
    </ul>
  );
}

/** The map, big and readable: it is the content of the panel, never a backdrop. */
function MapImage({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={MAP} alt="Carte de l'Afrique : le Sénégal, la Guinée et la Côte d'Ivoire en ambre" className={cn("auth-map", className)} />;
}

/**
 * Right-hand side of the split layout.
 * - `cadre`: the map fills the whole panel, the copy floats on it.
 * - `bande`: the map takes the top three quarters, a navy band with the countries closes the panel.
 */
function BrandPanel({ panel }: { panel: "cadre" | "bande" }) {
  if (panel === "bande") {
    return (
      <aside className="relative hidden flex-col lg:flex">
        <div className={cn("relative min-h-0 flex-1", SAND)}>
          <MapImage className="absolute inset-0 size-full object-contain object-center p-2 xl:p-6" />
        </div>
        <div className="relative z-10 -mt-8 rounded-t-[2rem] bg-[#0a2a47] px-10 pb-9 pt-8 text-[#fbfaf6] xl:px-14">
          <h2 className="text-3xl font-extrabold leading-[1.1] tracking-tight xl:text-4xl">Déjà en route dans trois pays.</h2>
          <ul className="mt-5 grid grid-cols-3 gap-4">
            {COUNTRIES.map((c) => (
              <li key={c.country} className="border-l-2 border-[#f4a521] pl-3">
                <p className="font-semibold">{c.country}</p><p className="text-sm text-white/60">{c.city}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }
  return (
    <aside className={cn("relative hidden overflow-hidden lg:block", SAND)}>
      <MapImage className="absolute inset-y-0 right-0 h-full w-full object-contain object-right p-3" />
      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        <div className="max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#0a2a47] px-3.5 py-1.5 text-xs font-semibold text-white"><span className="size-1.5 rounded-full bg-[#f4a521]" />Console plateforme</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-[#0a2a47] xl:text-[2.75rem]">Toutes les lignes, un seul poste de contrôle.</h2>
        </div>
        <div className="max-w-sm self-end rounded-2xl bg-white/90 p-5 shadow-card backdrop-blur"><Points /></div>
      </div>
    </aside>
  );
}

export interface AuthShellProps {
  title: string; description?: string;
  /** "Étape 1 sur 2" indicator. */
  step?: { current: number; total: number; label: string };
  children?: React.ReactNode; footer?: React.ReactNode; centered?: boolean;
  /** Layout of the page: two split variants, or a full-page map with a floating form. */
  panel?: AuthPanel;
}

function Content({ title, description, step, children, footer, centered, logoSize }: AuthShellProps & { logoSize: number }) {
  return (
    <>
      <div className={cn("auth-rise", centered && "flex justify-center")} style={rise(0)}><ThemedLogo height={logoSize} /></div>
      {step && (
        <div className={cn("auth-rise mt-9 flex items-center gap-3", centered && "justify-center")} style={rise(1)} aria-label={`Étape ${step.current} sur ${step.total}`}>
          <span className="flex gap-1.5">
            {Array.from({ length: step.total }, (_, i) => <span key={i} className={cn("h-1.5 w-8 rounded-full", i < step.current ? "bg-accent" : "bg-border")} />)}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">{step.label}</span>
        </div>
      )}
      <h1 className={cn("auth-rise text-3xl font-extrabold tracking-tight", step ? "mt-4" : "mt-9")} style={rise(2)}>{title}</h1>
      {description && <p className="auth-rise mt-2 text-[15px] text-muted-foreground" style={rise(3)}>{description}</p>}
      {children && <div className="auth-rise mt-8" style={rise(4)}>{children}</div>}
      {footer && <div className="auth-rise mt-8" style={rise(5)}>{footer}</div>}
    </>
  );
}

function Copyright({ className }: { className?: string }) {
  return <p className={cn("auth-rise text-xs text-muted-foreground", className)} style={rise(8)}>© {new Date().getFullYear()} Sira. Tous droits réservés.</p>;
}

export function AuthShell(props: AuthShellProps) {
  const { panel = "plein", centered } = props;
  if (panel === "plein") {
    // The map fills the page; the form is a card floating on its left.
    return (
      <div className={cn("relative min-h-screen overflow-hidden", SAND)}>
        <MapImage className="pointer-events-none absolute inset-y-0 right-0 h-full w-full object-contain object-right-center opacity-35 lg:opacity-100 lg:w-[68%] lg:object-center" />
        <header className="auth-rise absolute right-0 top-0 hidden max-w-md p-12 lg:block xl:right-8 xl:p-14" style={rise(6)}>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#0a2a47] px-3.5 py-1.5 text-xs font-semibold text-white"><span className="size-1.5 rounded-full bg-[#f4a521]" />Console plateforme</p>
          <p className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-[#0a2a47]">Toutes les lignes, un seul poste de contrôle.</p>
        </header>
        <main className="relative flex min-h-screen items-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
          <div className={cn("auth-rise w-full max-w-md rounded-3xl bg-card p-8 shadow-2xl ring-1 ring-black/5 sm:p-10", centered && "text-center")} style={rise(-1.5)}>
            <Content {...props} logoSize={52} />
          </div>
        </main>
        <Copyright className="absolute bottom-5 left-5 z-10 sm:left-10 lg:left-16 xl:left-24" />
      </div>
    );
  }
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className={cn("mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10", centered && "text-center")}>
          <Content {...props} logoSize={64} />
        </div>
        <Copyright className="text-center" />
      </main>
      <BrandPanel panel={panel} />
    </div>
  );
}
