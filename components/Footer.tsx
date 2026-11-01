import Logo from "@/components/Logo";
import { ButtonLink, Title2 } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion";
import { chapters } from "@/content/solution";
import { FooterLink } from "@/components/footer/FooterLink";
import { FooterRoute, PerforatedEdge } from "@/components/footer/FooterTop";

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
      <PerforatedEdge />
      <div className="relative overflow-hidden bg-gradient-to-b from-navy to-navy-deep text-white">
        {/* Anneaux très discrets */}
        <svg aria-hidden="true" className="pointer-events-none absolute -right-40 top-10 h-[520px] w-[520px] text-amber/[0.07]" viewBox="0 0 520 520" fill="none">
          <circle cx="260" cy="260" r="255" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="260" cy="260" r="190" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 8" />
          <circle cx="260" cy="260" r="125" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <svg aria-hidden="true" className="pointer-events-none absolute -left-44 bottom-24 h-[420px] w-[420px] text-amber/[0.05]" viewBox="0 0 420 420" fill="none">
          <circle cx="210" cy="210" r="205" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="210" cy="210" r="140" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 8" />
        </svg>

        <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-12 lg:pt-14">
          <FooterRoute />

          {/* Bande d'appel : un billet à souche */}
          <div className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-navy-dark to-navy-deep lg:mt-12">
            <Stagger className="flex flex-col md:flex-row md:items-stretch" stagger={0.07}>
              <StaggerItem className="flex-1 px-7 py-9 sm:px-10 sm:py-11">
                <p className={heading}>DKR → TBA · Prochain départ</p>
                <Title2
                  as="h2"
                  tone="dark"
                  lead="Prêt à"
                  accent="embarquer ?"
                  className="mt-3 text-4xl sm:text-5xl"
                />
                <p className="mt-4 max-w-md text-base text-white/80">
                  Une démonstration sur des données d&apos;exemple, adaptée à vos lignes et à vos équipes.
                </p>
              </StaggerItem>
              <StaggerItem className="relative flex items-center justify-center border-t-2 border-dashed border-white/20 px-7 py-8 md:w-72 md:border-l-2 md:border-t-0 md:px-8">
                <span aria-hidden="true" className="absolute -left-3 -top-[13px] h-6 w-6 rounded-full md:left-[-13px] md:-top-3" style={{ backgroundColor: "#1c2544" }} />
                <span aria-hidden="true" className="absolute -right-3 -top-[13px] h-6 w-6 rounded-full md:-bottom-3 md:left-[-13px] md:right-auto md:top-auto" style={{ backgroundColor: "#1c2544" }} />
                <ButtonLink href="/demo" variant="accent-dark">
                  Demander une démo
                  <span data-arrow aria-hidden="true" className="ml-2">→</span>
                </ButtonLink>
              </StaggerItem>
            </Stagger>
          </div>

          {/* Grille principale */}
          <Stagger className="mt-14 grid gap-12 md:grid-cols-12 md:gap-8 lg:mt-16" stagger={0.07}>
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
