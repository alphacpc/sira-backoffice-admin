"use client";

import { useState, type FormEvent } from "react";

const field =
  "mt-1 w-full rounded-lg border border-ink/20 bg-white px-4 py-2.5 text-ink focus:border-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";

export default function DemoForm() {
  const [done, setDone] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const body = [
      `Nom : ${d.get("name")}`,
      `Email : ${d.get("email")}`,
      `Compagnie : ${d.get("company") || "—"}`,
      `Taille de flotte : ${d.get("fleet") || "—"}`,
      "",
      String(d.get("message") || ""),
    ].join("\n");
    window.location.href = `mailto:contact@sira.app?subject=${encodeURIComponent(
      "Demande de démonstration Sira"
    )}&body=${encodeURIComponent(body)}`;
    setDone(true);
  }

  if (done) {
    return (
      <div role="status" className="rounded-2xl border border-forest/30 bg-forest/5 p-8">
        <p className="font-serif text-xl">Votre messagerie s&apos;est ouverte.</p>
        <p className="mt-2 text-sm text-ink/75">
          Envoyez le message prérempli pour finaliser votre demande. Ce site n&apos;envoie rien de
          lui-même : si rien ne s&apos;est ouvert, écrivez-nous à contact@sira.app.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">Nom</label>
        <input id="name" name="name" type="text" required autoComplete="name" className={field} />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />
      </div>
      <div>
        <label htmlFor="company" className="block text-sm font-medium">Compagnie</label>
        <input id="company" name="company" type="text" autoComplete="organization" className={field} />
      </div>
      <div>
        <label htmlFor="fleet" className="block text-sm font-medium">Taille de la flotte</label>
        <select id="fleet" name="fleet" className={field} defaultValue="">
          <option value="">Je ne sais pas encore</option>
          <option>Moins de 10 bus</option>
          <option>10 à 50 bus</option>
          <option>Plus de 50 bus</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium">Votre besoin</label>
        <textarea id="message" name="message" rows={4} className={field} />
      </div>
      <button
        type="submit"
        className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white transition hover:bg-forest-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      >
        Préparer mon message
      </button>
    </form>
  );
}
