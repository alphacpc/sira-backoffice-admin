import Link from "next/link";
import Logo from "@/components/Logo";

const groups = [
  {
    title: "Sira",
    links: [
      { href: "/solution", label: "La solution" },
      { href: "/pour-qui", label: "Pour qui" },
      { href: "/securite", label: "Sécurité" },
      { href: "/tarifs", label: "Tarifs" },
      { href: "/demo", label: "Demander une démo" },
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
    <footer className="bg-forest-deep text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Logo height={44} variant="dark" />
            <p className="mt-4 max-w-sm text-sm text-white/70">
              La plateforme des compagnies de transport interurbain en Afrique
              de l&apos;Ouest : flotte, billetterie, colis, équipes et conformité.
            </p>
            <p className="mt-4 text-sm text-white/70">contact@sira.app</p>
          </div>
          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="text-sm font-semibold">{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-white/70 transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-12 border-t border-white/10 pt-6 text-xs text-white/70">
          © {new Date().getFullYear()} Sira. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
