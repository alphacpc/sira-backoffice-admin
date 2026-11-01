import Link from "next/link";
import Logo from "@/components/Logo";

const groups = [
  {
    title: "Produit",
    links: [
      { href: "/pourquoi-sira", label: "Pourquoi Sira" },
      { href: "/solutions", label: "Solutions" },
      { href: "/services", label: "Services" },
      { href: "/reservation", label: "Réservation en ligne" },
      { href: "/reseau", label: "Réseau" },
      { href: "/applications", label: "Applications" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { href: "/entreprises", label: "Pour les compagnies" },
      { href: "/tarifs", label: "Tarifs" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact & démo" },
    ],
  },
  {
    title: "Technique",
    links: [
      { href: "/architecture", label: "Architecture" },
      { href: "/methode", label: "Méthode" },
      { href: "/securite", label: "Sécurité & conformité" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/confidentialite", label: "Confidentialité" },
      { href: "/cgu", label: "Conditions d'utilisation" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-primary-deep text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div>
            <Logo height={52} variant="dark" />
            <p className="mt-4 max-w-xs text-sm text-white/60">
              Plateforme SaaS multi-tenant pour les compagnies de transport
              interurbain en Afrique de l&apos;Ouest.
            </p>
            <p className="mt-4 text-sm text-white/50">contact@sira.app</p>
          </div>

          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="text-sm font-semibold text-white">{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 transition hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Sira. Tous droits réservés.
          </p>
          <p className="text-xs text-white/40">
            Applications mobiles bientôt sur iOS &amp; Android.
          </p>
        </div>
      </div>
    </footer>
  );
}
