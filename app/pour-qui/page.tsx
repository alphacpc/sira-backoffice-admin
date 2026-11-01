import type { Metadata } from "next";
import { Container, Eyebrow, ButtonLink } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/icons";
import { BrowserFrame, PhoneShell } from "@/components/mockups/Frame";
import DashboardMock from "@/components/mockups/DashboardMock";
import SeatMapMock from "@/components/mockups/SeatMapMock";
import TicketMock from "@/components/mockups/TicketMock";
import ParcelTrackingMock from "@/components/mockups/ParcelTrackingMock";
import { audiences, type Audience } from "@/content/audiences";

export const metadata: Metadata = {
  title: "Pour qui",
  description:
    "Ce que Sira change pour le dirigeant, l'agent de guichet, le personnel de terrain et le voyageur.",
};

function AudienceMock({ id }: { id: Audience["id"] }) {
  switch (id) {
    case "dirigeant":
      return (
        <BrowserFrame url="app.sira.app/tableau-de-bord">
          <DashboardMock />
        </BrowserFrame>
      );
    case "guichet":
      return (
        <BrowserFrame url="app.sira.app/reservations/nouvelle">
          <div className="bg-cream p-6">
            <SeatMapMock selected={21} />
          </div>
        </BrowserFrame>
      );
    case "terrain":
      return (
        <PhoneShell>
          <ParcelTrackingMock active={1} />
        </PhoneShell>
      );
    case "voyageur":
      return (
        <PhoneShell>
          <div className="min-h-[430px] bg-cream p-4">
            <TicketMock />
          </div>
        </PhoneShell>
      );
  }
}

export default function ForWhoPage() {
  return (
    <main>
      <section className="pb-6 pt-16 lg:pt-24">
        <Container>
          <Reveal>
            <Eyebrow>Pour qui</Eyebrow>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Chacun voit ce dont il a besoin, et rien de plus.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink/75">
              Les accès suivent le rôle : un agent de guichet ne voit pas la paie, un responsable de
              compagnie est limité à sa propre compagnie.
            </p>
          </Reveal>
        </Container>
      </section>

      {audiences.map((a, i) => (
        <section key={a.id} id={a.id} className={`py-16 ${i % 2 ? "bg-sand/60" : ""}`}>
          <Container
            className={`grid grid-cols-1 items-center gap-12 lg:grid-cols-2 [&>*]:min-w-0 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}
          >
            <Reveal>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest/10 text-forest">
                <Icon name={a.icon} className="h-6 w-6" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-accent-ink">
                {a.role}
              </p>
              <h2 className="mt-1 text-3xl font-semibold">{a.title}</h2>
              <p className="mt-3 text-xl text-ink/80">{a.goal}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink/85">
                {a.does.map((d) => (
                  <li key={d} className="flex gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                    {d}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.08}>
              <AudienceMock id={a.id} />
            </Reveal>
          </Container>
        </section>
      ))}

      <section className="pb-24 pt-8">
        <Container>
          <div className="rounded-3xl bg-forest px-8 py-12 text-center text-white">
            <h2 className="text-3xl font-semibold">Voyez-le avec votre propre équipe.</h2>
            <div className="mt-6 flex justify-center">
              <ButtonLink href="/demo" variant="accent">
                Demander une démo
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
