"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/solutions", label: "Solutions" },
  { href: "/services", label: "Services" },
  { href: "/applications", label: "Applications" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/reservation", label: "Réservation" },
  { href: "/reseau", label: "Réseau" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-primary/10 bg-white/85 shadow-sm backdrop-blur-md"
          : "border-transparent bg-white"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />

        <button
          type="button"
          className="text-primary md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Ouvrir le menu"
        >
          <span className="block h-0.5 w-6 bg-primary" />
          <span className="mt-1.5 block h-0.5 w-6 bg-primary" />
          <span className="mt-1.5 block h-0.5 w-6 bg-primary" />
        </button>

        <ul className="hidden items-center gap-6 md:flex">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`text-sm transition ${
                    isActive
                      ? "font-semibold text-accent-dark"
                      : "font-medium text-primary/80 hover:text-accent"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href="/contact"
          className="hidden rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark md:inline-block"
        >
          Demander une démo
        </Link>
      </nav>

      {open && (
        <div className="border-t border-primary/10 px-6 py-4 md:hidden">
          <ul className="flex flex-col gap-3">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block text-sm ${
                      isActive
                        ? "font-semibold text-accent-dark"
                        : "font-medium text-primary/80"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="mt-4 block rounded-full bg-primary px-5 py-2 text-center text-sm font-semibold text-white"
          >
            Demander une démo
          </Link>
        </div>
      )}
    </header>
  );
}
