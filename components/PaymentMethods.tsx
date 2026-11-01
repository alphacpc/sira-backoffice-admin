"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Container, Eyebrow, Title2 } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";

function CardGlyph() {
  return (
    <svg viewBox="0 0 96 64" className="h-16 w-auto" role="img" aria-label="Carte bancaire">
      <rect x="2" y="2" width="92" height="60" rx="8" fill="#fff" stroke="#1e2749" strokeWidth="2.5" />
      <rect x="2" y="14" width="92" height="12" fill="#1e2749" />
      <rect x="12" y="36" width="16" height="12" rx="3" fill="#f5a524" />
      <rect x="36" y="40" width="30" height="4" rx="2" fill="#1e2749" opacity="0.25" />
      <rect x="36" y="48" width="18" height="4" rx="2" fill="#1e2749" opacity="0.25" />
    </svg>
  );
}

const methods: { name: string; kind: string; text: string; logo: ReactNode }[] = [
  {
    name: "Wave",
    kind: "Mobile money",
    text: "Paiement depuis le téléphone du voyageur.",
    logo: (
      <Image src="/images/payments/wave-400.png" alt="Wave" width={400} height={400} sizes="64px" className="h-16 w-16 object-contain" />
    ),
  },
  {
    name: "Orange Money",
    kind: "Mobile money",
    text: "Paiement depuis le compte Orange Money du voyageur.",
    logo: (
      <Image src="/images/payments/orange-money-trim.png" alt="Orange Money" width={500} height={600} sizes="64px" className="h-16 w-auto object-contain" />
    ),
  },
  {
    name: "Carte bancaire",
    kind: "Paiement par carte",
    text: "Paiement en ligne sécurisé par carte.",
    logo: <CardGlyph />,
  },
];

export default function PaymentMethods() {
  return (
    <section className="bg-mist py-16 lg:py-24">
      <Container>
        <Reveal>
          <Eyebrow>Moyens de paiement</Eyebrow>
          <Title2
            lead="Vos voyageurs paient"
            accent="comme ils en ont l'habitude."
            className="mt-4 max-w-3xl text-3xl sm:text-4xl lg:text-5xl"
          />
          <p className="mt-5 max-w-2xl text-lg text-ink/75">
            La billetterie de Sira accepte les moyens de paiement les plus utilisés en Afrique de l&apos;Ouest,
            dans les devises XOF, EUR et USD.
          </p>
        </Reveal>
        <Stagger as="ul" stagger={0.1} className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3 [&>*]:min-w-0">
          {methods.map((m) => (
            <StaggerItem
              as="li"
              key={m.name}
              className="group rounded-2xl border border-transparent bg-white p-6 shadow-soft ring-1 ring-navy/10 transition duration-300 ease-out hover:-translate-y-1 hover:border-amber hover:ring-amber motion-reduce:transform-none"
            >
              <div className="flex h-16 items-center">{m.logo}</div>
              <h3 className="mt-5 text-xl font-extrabold tracking-tight text-navy">{m.name}</h3>
              <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-navy/70">
                {m.kind}
              </p>
              <div aria-hidden="true" className="my-4 border-t-2 border-dashed border-navy/20" />
              <p className="text-sm text-ink/75">{m.text}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
