import type { AuditAction, DataCategory, AccessType } from "@/lib/types";
import { auditActionLabel, accessTypeLabel, dataCategoryLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const TONE = {
  lime: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  zinc: "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200",
} as const;
export type Tone = keyof typeof TONE;

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium", TONE[tone])}><span aria-hidden className="size-1.5 rounded-full bg-current" />{children}</span>;
}

export const ACTION_TONE: Record<AuditAction, Tone> = {
  CREATE: "lime", UPDATE: "sky", DELETE: "rose", LOGIN: "zinc", LOGIN_FAILED: "rose", EXPORT: "violet", PERMISSION_CHANGE: "amber",
};
export const ActionPill = ({ action }: { action: AuditAction }) => <Pill tone={ACTION_TONE[action]}>{auditActionLabel(action)}</Pill>;

const ACCESS_TONE: Record<AccessType, Tone> = { VIEW: "zinc", EXPORT: "violet", MODIFY: "amber", DELETE: "rose" };
export const AccessPill = ({ type }: { type: AccessType }) => <Pill tone={ACCESS_TONE[type]}>{accessTypeLabel(type)}</Pill>;

const CATEGORY_TONE: Record<DataCategory, Tone> = { IDENTITY: "sky", FINANCIAL: "lime", LOCATION: "orange", HEALTH: "rose", CONTACT: "violet", CONSENT: "amber" };
export const CategoryPill = ({ category }: { category: DataCategory }) => <Pill tone={CATEGORY_TONE[category]}>{dataCategoryLabel(category)}</Pill>;

/** Initials avatar for a person or a system actor (orange, round, bold). */
export function ActorAvatar({ name, system = false }: { name: string; system?: boolean }) {
  return <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold", system ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200" : "bg-[#ea580c] text-white")}>{system ? "SY" : name.trim().slice(0, 2).toUpperCase()}</span>;
}
