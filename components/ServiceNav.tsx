"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

export type ServiceNavItem = {
  slug: string;
  name: string;
  icon: string;
};

/** Sous-navigation sticky avec mise en évidence du module visible (scrollspy). */
export default function ServiceNav({ items }: { items: ServiceNavItem[] }) {
  const [active, setActive] = useState<string>("");
  const [top, setTop] = useState(72);

  // Mesure la hauteur du header sticky pour caler la sous-navigation juste en dessous.
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector("header");
      if (header) setTop(header.getBoundingClientRect().height);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const ids = items.map((it) => it.slug);

    const onScroll = () => {
      const line = top + 8;
      const first = document.getElementById(ids[0]);
      if (first && first.getBoundingClientRect().top > line) {
        setActive("");
        return;
      }
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items, top]);

  return (
    <div
      className="sticky z-40 border-b border-primary/10 bg-white/85 backdrop-blur-md"
      style={{ top }}
    >
      <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-6 py-3">
        {items.map((item) => {
          const isActive = active === item.slug;
          return (
            <a
              key={item.slug}
              href={`#${item.slug}`}
              aria-current={isActive ? "true" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-white"
                  : "text-primary/70 hover:bg-primary/5 hover:text-primary"
              }`}
            >
              <Icon
                name={item.icon}
                className={`h-4 w-4 ${
                  isActive ? "text-accent" : "text-accent-dark"
                }`}
              />
              {item.name}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
