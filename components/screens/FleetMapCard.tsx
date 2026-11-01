import Image from "next/image";

export function FleetMapCard({ className = "" }: { className?: string }) {
  return (
    <figure className={`mx-auto w-full ${className}`}>
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-lift">
        <Image
          src="/images/carte-temps-reel.png"
          alt="Carte de suivi de flotte : un bus en route entre Dakar, Thiès et Touba, avec sa fiche de trajet."
          width={1780}
          height={1180}
          sizes="(min-width: 1024px) 50vw, 90vw"
          className="block h-auto w-full"
        />
      </div>
      <figcaption className="mt-3 text-center font-mono text-[11px] text-ink/70">
        Aperçu illustratif
      </figcaption>
    </figure>
  );
}
