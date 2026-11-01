import type { ReactNode } from "react";

/**
 * Ticket-style card. With `stub`, the card is split by a dashed perforation
 * with two half-discs cut into its edges, like the Sira e-ticket.
 * `notch` must be the real background colour of the section behind the card.
 */
export function Coupon({
  children,
  stub,
  tone = "light",
  notch = "#fafafa",
  className = "",
}: {
  children: ReactNode;
  stub?: ReactNode;
  tone?: "light" | "navy";
  notch?: string;
  className?: string;
}) {
  const navy = tone === "navy";
  return (
    <div
      className={`relative overflow-hidden rounded-3xl ${
        navy ? "bg-navy text-white" : "bg-white text-ink shadow-soft"
      } ${className}`}
    >
      <div className="p-6 lg:p-8">{children}</div>
      {stub ? (
        <>
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: notch, boxShadow: navy ? undefined : "inset 0 0 0 1px rgb(30 39 73 / 0.1)" }}
            />
            <span
              aria-hidden="true"
              className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: notch, boxShadow: navy ? undefined : "inset 0 0 0 1px rgb(30 39 73 / 0.1)" }}
            />
            <div
              aria-hidden="true"
              className={`mx-6 border-t-2 border-dashed ${navy ? "border-white/25" : "border-navy/20"}`}
            />
          </div>
          <div className="p-6 lg:p-8">{stub}</div>
        </>
      ) : null}
    </div>
  );
}
