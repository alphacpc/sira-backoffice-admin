import type { ReactNode } from "react";

/**
 * App-style frame, same gesture as the Sira app visuals: thick navy bezel,
 * rounded 2.5rem, navy header block (mono amber label, white bold title),
 * cream body, white footer. `panel` is the wider variant for team screens.
 */
export function PhoneScreen({
  label,
  title,
  subtitle,
  badge,
  footer,
  children,
  variant = "phone",
  className = "",
}: {
  label: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  variant?: "phone" | "panel";
  className?: string;
}) {
  return (
    <figure
      className={`mx-auto w-full ${variant === "phone" ? "max-w-[360px]" : "max-w-[420px]"} ${className}`}
    >
      <div className="overflow-hidden rounded-[2.5rem] border-[9px] border-navy-deep bg-[#fcfaf5] shadow-lift">
        <div className="flex items-center justify-between px-6 pb-1 pt-3 font-mono text-[10px] font-semibold text-navy/40">
          <span>9:41</span>
          <span aria-hidden="true" className="h-1.5 w-8 rounded-full bg-navy/10" />
        </div>
        <div className="bg-navy px-5 pb-4 pt-4 text-white">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber">
              {label}
            </p>
            {badge}
          </div>
          <p className="mt-1.5 text-[19px] font-extrabold leading-tight tracking-tight">{title}</p>
          {subtitle ? <p className="mt-1 text-xs font-semibold text-white/70">{subtitle}</p> : null}
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer ? <div className="border-t border-navy/10 bg-white px-5 py-3.5">{footer}</div> : null}
      </div>
      <figcaption className="mt-3 text-center font-mono text-[11px] text-ink/70">
        Aperçu illustratif
      </figcaption>
    </figure>
  );
}

export function Pill({
  tone,
  children,
}: {
  tone: "amber" | "green" | "grey" | "navy";
  children: ReactNode;
}) {
  const t = {
    amber: "bg-amber text-navy",
    green: "bg-[#e3f3ea] text-[#16794d]",
    grey: "bg-[#efece4] text-navy/70",
    navy: "bg-white/15 text-white",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${t}`}
    >
      {children}
    </span>
  );
}

export function Check({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#1fa36c] text-white"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}
