import { Enter } from "@/components/motion";
import { RentalRequestScreen } from "./RentalRequestScreen";
import { QuoteDocument } from "./QuoteDocument";

/** « Lien de réservation » chip, used on the dashed link between the phone and the quote. */
function LinkChip({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full bg-amber px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-navy shadow-soft ${className}`}
    >
      Lien de réservation
    </span>
  );
}

/**
 * Rental stop visual: the public booking-link phone and the quote sheet laid over a pale panel,
 * tied by a dashed amber link. `side` overlaps them horizontally from `lg` (needs ~560 px);
 * `stack` keeps them one above the other, tied by a vertical link.
 */
export function LocationComposition({
  className = "",
  variant = "stack",
  panel = true,
  quote = true,
}: {
  className?: string;
  variant?: "side" | "stack";
  panel?: boolean;
  /** `false` : le téléphone du lien de réservation seul, sans le devis ni le lien pointillé. */
  quote?: boolean;
}) {
  const side = variant === "side";
  if (!quote) {
    return (
      <div className={`relative ${panel ? "rounded-[2rem] bg-mist px-4 py-10 sm:px-8 lg:px-10 lg:py-14" : ""} ${className}`}>
        <Enter x={36} duration={0.8} delay={0.1} className="relative mx-auto max-w-[360px]">
          <RentalRequestScreen className="max-w-[360px]" />
        </Enter>
      </div>
    );
  }
  return (
    <div
      className={`relative ${panel ? "rounded-[2rem] bg-mist px-4 py-10 sm:px-8 lg:px-10 lg:py-14" : ""} ${className}`}
    >
      <div className={`relative mx-auto ${side ? "max-w-[548px]" : "max-w-[360px]"}`}>
        <div className={`relative ${side ? "lg:flex lg:items-start" : ""}`}>
          <Enter x={-36} duration={0.8} delay={0.1} className={`relative z-10 ${side ? "lg:w-[300px] lg:shrink-0" : ""}`}>
            <RentalRequestScreen className="max-w-[300px]" />
          </Enter>

          {/* Vertical link between the two screens (stacked layouts). */}
          <div aria-hidden="true" className={`flex flex-col items-center py-3 ${side ? "lg:hidden" : ""}`}>
            <span className="h-8 border-l-2 border-dashed border-amber" />
            <LinkChip />
            <span className="h-8 border-l-2 border-dashed border-amber" />
          </div>

          {side ? (
            <Enter
              clip="right"
              fade={false}
              duration={1}
              delay={0.5}
              aria-hidden="true"
              className="pointer-events-none absolute left-[262px] top-[34px] z-20 hidden h-[84px] w-[140px] lg:block"
            >
              <svg viewBox="0 0 140 84" className="h-full w-full overflow-visible text-amber" fill="none">
                <path d="M0 2 C 70 2, 108 14, 112 82" stroke="currentColor" strokeWidth="2.5" strokeDasharray="7 6" strokeLinecap="round" />
              </svg>
            </Enter>
          ) : null}
          {side ? (
            <Enter delay={1.1} y={8} duration={0.5} aria-hidden="true" className="pointer-events-none absolute left-[270px] top-[4px] z-20 hidden lg:block">
              <LinkChip />
            </Enter>
          ) : null}

          <div className={side ? "lg:z-10 lg:-ml-8 lg:mt-28 lg:w-[280px] lg:shrink-0 lg:rotate-2" : ""}>
            <QuoteDocument className="max-w-[330px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
