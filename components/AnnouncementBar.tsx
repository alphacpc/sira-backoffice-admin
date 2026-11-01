import Link from "next/link";

export default function AnnouncementBar() {
  return (
    <div className="bg-primary px-4 py-2 text-center text-sm text-white">
      <p className="truncate">
        <span className="font-semibold text-accent">Nouveau&nbsp;:</span>{" "}
        les applications mobiles Sira arrivent bientôt.{" "}
        <Link
          href="/applications"
          className="font-semibold underline underline-offset-2 hover:text-accent"
        >
          En savoir plus →
        </Link>
      </p>
    </div>
  );
}
