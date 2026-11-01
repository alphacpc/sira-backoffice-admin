import Logo from "@/components/Logo";
import { Stagger, StaggerItem } from "@/components/motion";
import { chapters } from "@/content/solution";
import { FooterLink } from "@/components/footer/FooterLink";

const site = [
  { href: "/", label: "Accueil" },
  { href: "/solution", label: "La solution" },
  { href: "/pour-qui", label: "Pour qui" },
  { href: "/securite", label: "Sécurité" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/demo", label: "Demander une démo" },
];

const legal = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cgu", label: "Conditions d'utilisation" },
];

const heading = "font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amber";

export default function Footer() {
  // Évalué au rendu serveur (build) : aucun écart d'hydratation, ce composant n'est pas hydraté.
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-4">
      <div className="relative overflow-hidden bg-gradient-to-b from-navy to-navy-deep text-white">
        <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-12 lg:pt-14">
          {/* Grille principale */}
          <Stagger className="grid gap-12 md:grid-cols-12 md:gap-8" stagger={0.07}>
            <StaggerItem className="md:col-span-12 lg:col-span-4">
              <Logo height={44} variant="dark" />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
                La plateforme des compagnies de transport interurbain en Afrique de l&apos;Ouest :
                flotte, billetterie, colis, équipes et conformité.
              </p>
              <a
                href="mailto:contact@sira.app"
                className="mt-4 inline-block rounded-sm font-mono text-sm text-white underline decoration-amber decoration-2 underline-offset-[6px] transition-colors hover:text-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber"
              >
                contact@sira.app
              </a>
            </StaggerItem>

            <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:col-span-12 md:grid-cols-3 lg:col-span-8 lg:gap-x-8">
              <StaggerItem className="col-span-2 md:col-span-1">
                <nav aria-label="Les chapitres">
                  <p className={heading}>Les chapitres</p>
                  <ul className="mt-4 space-y-3">
                    {chapters.map((c) => (
                      <li key={c.id}>
                        <FooterLink href={`/solution#${c.id}`} code={c.stop.code}>
                          {c.stop.name}
                        </FooterLink>
                      </li>
                    ))}
                  </ul>
                </nav>
              </StaggerItem>
              <StaggerItem>
                <nav aria-label="Sira">
                  <p className={heading}>Sira</p>
                  <ul className="mt-4 space-y-3">
                    {site.map((l) => (
                      <li key={l.href}>
                        <FooterLink href={l.href}>{l.label}</FooterLink>
                      </li>
                    ))}
                  </ul>
                </nav>
              </StaggerItem>
              <StaggerItem>
                <nav aria-label="Légal">
                  <p className={heading}>Légal</p>
                  <ul className="mt-4 space-y-3">
                    {legal.map((l) => (
                      <li key={l.href}>
                        <FooterLink href={l.href}>{l.label}</FooterLink>
                      </li>
                    ))}
                  </ul>
                </nav>
              </StaggerItem>
            </div>
          </Stagger>

          {/* Barre du bas */}
          <div className="mt-14 flex flex-col gap-4 border-t border-dashed border-white/20 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-xs text-white/70">
              © {year} Sira. Tous droits réservés.
            </p>
            <p aria-hidden="true" className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-amber">
              DKR → TBA · Sira
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {legal.map((l) => (
                <li key={l.href}>
                  <FooterLink href={l.href} small>
                    {l.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
