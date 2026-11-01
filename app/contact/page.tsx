import ContactForm from "@/components/ContactForm";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/motion";

const channels = [
  { icon: "mail", title: "Email", value: "contact@sira.app", note: "Réponse sous deux jours ouvrés" },
  { icon: "phone", title: "Téléphone", value: "+221 XX XXX XX XX", note: "Numéro indicatif — à confirmer" },
  { icon: "clock", title: "Démo", value: "Sur rendez-vous", note: "30 minutes pour découvrir la plateforme" },
];

export default function ContactPage() {
  return (
    <main className="bg-white">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgb(245_165_36/0.12),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-20 sm:pt-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Contact
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              Parlons de votre <span className="text-gradient">projet.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-primary/60">
              Une question, ou envie de voir Sira en action ? Remplissez le
              formulaire et nous reviendrons vers vous pour organiser une
              démonstration.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Formulaire + canaux ===== */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal>
            <ContactForm />
          </Reveal>

          <Reveal delay={0.08}>
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-primary">
                Demander une démonstration
              </h2>
              <p className="text-sm text-primary/60">
                Lors d&apos;une démonstration, nous parcourons ensemble vos
                besoins — flotte, lignes, volume d&apos;activité — et vous voyez
                la plateforme appliquée à votre cas.
              </p>
              <div className="space-y-4">
                {channels.map((channel) => (
                  <div
                    key={channel.title}
                    className="flex items-start gap-4 rounded-2xl border border-primary/10 bg-white p-5 transition hover:border-accent/40 hover:shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                      <Icon
                        name={channel.icon}
                        className="h-5 w-5 text-accent-dark"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        {channel.title}
                      </p>
                      <p className="mt-1 text-primary">{channel.value}</p>
                      <p className="mt-1 text-xs text-primary/50">
                        {channel.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
