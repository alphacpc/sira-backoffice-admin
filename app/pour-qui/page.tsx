import type { Metadata } from "next";
import Image from "next/image";
import { Container, Eyebrow, ButtonLink, Title2 } from "@/components/ui";
import { HeroBlock, Reveal } from "@/components/motion";
import { Icon } from "@/components/icons";
import { PhotoCard } from "@/components/PhotoCard";
import { audiences, type Audience } from "@/content/audiences";

export const metadata: Metadata = {
  title: "Pour qui",
  description:
    "Ce que Sira change pour le dirigeant, l'agent de guichet, le personnel de terrain et le voyageur.",
};

const get = (id: Audience["id"]) => audiences.find((a) => a.id === id)!;

function Rings({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute text-amber ${className}`} viewBox="0 0 520 520" fill="none">
      {[260, 190, 120].map((r) => (
        <circle key={r} cx="260" cy="260" r={r} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/**
 * The app screenshots carry a cream margin around the phone body. Crop it so
 * the phone sits directly on our own backgrounds. Box = phone body of the PNG.
 */
function PhoneCrop({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative aspect-[258/546] overflow-hidden rounded-[2.3rem] shadow-lift ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={820}
        height={1576}
        sizes="(min-width: 1024px) 22vw, 60vw"
        className="absolute max-w-none"
        style={{ width: "120.9%", left: "-10.5%", top: "-4.95%" }}
      />
    </div>
  );
}

/** Mono role label with the profile icon, used as an overlapping card or a plain tag. */
function RoleTag({ a, index }: { a: Audience; index: number }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl bg-amber px-4 py-3 text-navy shadow-lift">
      <Icon name={a.icon} className="h-5 w-5" />
      <span>
        <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
          Profil {String(index + 1).padStart(2, "0")}
        </span>
        <span className="block text-sm font-bold leading-tight">{a.role}</span>
      </span>
    </div>
  );
}

function Heading({ a, dark = false }: { a: Audience; dark?: boolean }) {
  return (
    <>
      <h2 className={`text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl ${dark ? "text-white" : "text-navy"}`}>
        {a.title}
      </h2>
      <p className={`mt-4 max-w-lg text-lg leading-relaxed ${dark ? "text-white/80" : "text-ink/75"}`}>{a.goal}</p>
    </>
  );
}

function DoesList({ a, dark = false }: { a: Audience; dark?: boolean }) {
  return (
    <ul className="mt-6 max-w-lg">
      {a.does.map((d) => (
        <li
          key={d}
          className={`flex gap-3 border-t py-3 text-sm leading-relaxed ${
            dark ? "border-white/15 text-white/85" : "border-navy/10 text-ink/85"
          }`}
        >
          <span aria-hidden="true" className="mt-[7px] h-1.5 w-4 shrink-0 rounded-full bg-amber" />
          {d}
        </li>
      ))}
    </ul>
  );
}

export default function ForWhoPage() {
  const dirigeant = get("dirigeant");
  const guichet = get("guichet");
  const terrain = get("terrain");
  const voyageur = get("voyageur");

  return (
    <main>
      <section className="relative overflow-hidden bg-paper pb-6 pt-14 lg:pt-20">
        <Rings className="-right-40 -top-52 h-[520px] w-[520px]" />
        <Container className="relative">
          <div>
<HeroBlock>
            <Eyebrow>Pour qui</Eyebrow>
            <Title2
              as="h1"
              lead="Chacun voit ce dont il a besoin,"
              accent="et rien de plus."
              className="mt-5 max-w-3xl text-4xl sm:text-5xl lg:text-[3.4rem]"
            />
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/75">
              Les accès suivent le rôle : un agent de guichet ne voit pas la paie, un responsable de
              compagnie est limité à sa propre compagnie.
            </p>
            <nav aria-label="Profils" className="mt-8 flex flex-wrap gap-2.5">
              {audiences.map((a) => (
                <a
                  key={a.id}
                  href={`#${a.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-white px-4 py-2 text-sm font-semibold text-navy transition duration-200 hover:-translate-y-0.5 hover:border-navy hover:shadow-soft motion-reduce:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  <Icon name={a.icon} className="h-4 w-4 text-amber-ink" />
                  {a.title}
                </a>
              ))}
            </nav>
          </HeroBlock>
</div>
        </Container>
      </section>

      {/* 1. Dirigeant: navy block, large photo bleeding out of it, role card overlapping */}
      <section id="dirigeant" className="bg-paper py-12 lg:py-20">
        <Container>
          <Reveal>
            <div className="relative rounded-[2rem] bg-navy">
              <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
                <Rings className="-bottom-52 -left-44 h-[520px] w-[520px]" />
              </div>
              <div className="relative grid grid-cols-1 items-center gap-10 px-6 py-10 [&>*]:min-w-0 sm:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 lg:px-14 lg:pb-16 lg:pt-12">
                <div className="relative lg:-mt-24 lg:mb-0 lg:self-start">
                  <PhotoCard
                    src="/images/clean/gestionnaire-laptop.png"
                    alt="Une responsable d'exploitation consulte Sira sur son ordinateur portable."
                    width={1920}
                    height={1959}
                    rotate="left"
                    sizes="(min-width: 1024px) 34vw, 90vw"
                    className="mx-auto w-full max-w-[460px]"
                  />
                  <div className="absolute -bottom-5 right-2 sm:right-8 lg:-right-8">
                    <RoleTag a={dirigeant} index={0} />
                  </div>
                </div>
                <div className="pt-6 lg:pt-0">
                  <Heading a={dirigeant} dark />
                  <DoesList a={dirigeant} dark />
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 2. Guichet: text left, phone on an amber panel with a seat-picking detail */}
      <section id="guichet" className="bg-paper py-12 lg:py-20">
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 items-center gap-12 [&>*]:min-w-0 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div>
                <RoleTag a={guichet} index={1} />
                <div className="mt-7">
                  <Heading a={guichet} />
                  <DoesList a={guichet} />
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-[460px]">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 top-10 rounded-[2rem] bg-amber-soft"
                />
                <div className="relative mx-auto w-[58%] pb-8 lg:-translate-y-6 lg:pb-0">
                  <PhoneCrop
                    src="/images/sieges.png"
                    alt="Plan des sièges du bus : l'agent choisit les places du passager."
                  />
                </div>
                <div className="h-8" />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 3. Terrain: deep navy band, phone pushed above the band edge, text left */}
      <section id="terrain" className="bg-paper pb-12 pt-20 lg:pb-20 lg:pt-32">
        <Container>
          <Reveal>
            <div className="relative rounded-[2rem] bg-navy-deep">
              <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
                <Rings className="-bottom-44 right-10 h-[520px] w-[520px]" />
              </div>
              <div className="relative grid grid-cols-1 items-center gap-8 px-6 pb-10 [&>*]:min-w-0 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-14 lg:py-14">
                <div className="order-2 lg:order-1">
                  <RoleTag a={terrain} index={2} />
                  <div className="mt-7">
                    <Heading a={terrain} dark />
                    <DoesList a={terrain} dark />
                  </div>
                </div>
                <div className="order-1 mx-auto -mt-12 w-[64%] max-w-[300px] lg:order-2 lg:-mb-16 lg:-mt-32 lg:max-w-[320px]">
                  <PhoneCrop
                    className="ring-4 ring-amber"
                    src="/images/scan-ticket.png"
                    alt="Écran de contrôle à l'embarquement : le QR du billet est scanné, billet validé, siège 12A."
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 4. Voyageur: wide photo, text on a perforated card overlapping it */}
      <section id="voyageur" className="bg-paper pb-20 pt-12 lg:pb-28 lg:pt-20">
        <Container>
          <Reveal>
            <div className="relative lg:pb-16">
              <div aria-hidden="true" className="absolute -right-3 -top-3 hidden h-24 w-24 rounded-full bg-amber lg:block" />
              <PhotoCard
                src="/images/clean/voyageuse.jpg"
                alt="Une voyageuse serre contre elle l'arbre de son village, un billet confirmé Dakar-Touba affiché à l'écran."
                width={1920}
                height={1368}
                sizes="(min-width: 1024px) 62vw, 100vw"
                className="relative w-full lg:ml-auto lg:w-[64%]"
              />
              <div className="relative -mt-8 px-3 sm:px-8 lg:absolute lg:bottom-0 lg:left-0 lg:mt-0 lg:w-[41%] lg:px-0">
                <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-lift lg:p-8">
                  <RoleTag a={voyageur} index={3} />
                  <h2 className="mt-6 text-3xl font-extrabold leading-[1.08] tracking-tight text-navy">
                    {voyageur.title}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-ink/75">{voyageur.goal}</p>
                  <div aria-hidden="true" className="mt-5 border-t-2 border-dashed border-navy/20" />
                  <ul>
                    {voyageur.does.map((d) => (
                      <li key={d} className="flex gap-3 border-b border-navy/10 py-2.5 text-sm leading-relaxed text-ink/85 last:border-b-0">
                        <span aria-hidden="true" className="mt-[7px] h-1.5 w-4 shrink-0 rounded-full bg-amber" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-paper pb-24">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-navy px-8 py-14 text-center">
            <Rings className="-bottom-48 -right-32 h-[520px] w-[520px]" />
            <Title2
              tone="dark"
              lead="Voyez-le avec"
              accent="votre propre équipe."
              className="relative text-3xl sm:text-4xl"
            />
            <div className="relative mt-7 flex justify-center">
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
