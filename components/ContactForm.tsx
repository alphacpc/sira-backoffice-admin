"use client";

import { useState, type FormEvent } from "react";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-accent/30 bg-accent/10 p-8 text-primary"
      >
        <p className="font-semibold">Merci !</p>
        <p className="mt-2 text-sm text-primary/70">
          Votre demande a bien été prise en compte. Nous reviendrons vers vous
          pour organiser une démonstration.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-primary">
          Nom
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 w-full rounded-lg border border-primary/20 px-4 py-2 text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-primary">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-primary/20 px-4 py-2 text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="company" className="block text-sm font-medium text-primary">
          Compagnie
        </label>
        <input
          id="company"
          name="company"
          type="text"
          className="mt-1 w-full rounded-lg border border-primary/20 px-4 py-2 text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-primary">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          className="mt-1 w-full rounded-lg border border-primary/20 px-4 py-2 text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <button
        type="submit"
        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-dark"
      >
        Envoyer
      </button>
    </form>
  );
}
