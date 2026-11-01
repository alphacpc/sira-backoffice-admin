"use client";

import { useState, type FormEvent } from "react";

const field =
  "mt-1 w-full rounded-lg border border-ink/20 bg-white px-4 py-2.5 text-ink focus:border-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";

export default function DemoForm() {
  const [done, setDone] = useState(false);
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const text = [
      `Nom : ${d.get("name")}`,
      `Email : ${d.get("email")}`,
      `Compagnie : ${d.get("company") || "—"}`,
      `Taille de flotte : ${d.get("fleet") || "—"}`,
      "",
      String(d.get("message") || ""),
    ].join("\n");
    window.location.href = `mailto:contact@sira.app?subject=${encodeURIComponent(
      "Demande de démonstration Sira"
    )}&body=${encodeURIComponent(text)}`;
    setBody(text);
    setCopied(false);
    setDone(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
    } catch {
      /* rien à afficher */
    }
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
      <div role="status" aria-live="polite">
        {done && (
          <p className="text-sm text-ink/80">
            Votre messagerie s&apos;est ouverte avec un message prérempli. Envoyez-le pour finaliser
            votre demande. Ce site n&apos;envoie rien de lui-même : si rien ne s&apos;est ouvert,
            écrivez-nous à{" "}
            <a
              href="mailto:contact@sira.app"
              className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              contact@sira.app
            </a>
            .{" "}
            <button
              type="button"
              onClick={copy}
              className="rounded-full border border-ink/20 px-3 py-1 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              {copied ? "Message copié" : "Copier le message"}
            </button>
          </p>
        )}
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
