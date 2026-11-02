import {
  CheckCircle, FileArrowUp, Hourglass, PaperPlaneTilt, XCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { KycStage } from "@/lib/types";

export const STAGE_META: Record<KycStage, {
  label: string; hint: string; icon: typeof CheckCircle;
  dot: string; tint: string; badge: string; ring: string;
}> = {
  submitted: {
    label: "Soumis", hint: "Dossiers reçus, pas encore traités", icon: PaperPlaneTilt,
    dot: "bg-sky-500", tint: "bg-sky-500/[0.06]", badge: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300", ring: "ring-sky-400/60",
  },
  needs_info: {
    label: "Complément de dossier", hint: "En attente de pièces du client", icon: FileArrowUp,
    dot: "bg-orange-500", tint: "bg-orange-500/[0.06]", badge: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300", ring: "ring-orange-400/60",
  },
  in_review: {
    label: "En cours", hint: "Documents en cours de revue", icon: Hourglass,
    dot: "bg-violet-500", tint: "bg-violet-500/[0.06]", badge: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300", ring: "ring-violet-400/60",
  },
  approved: {
    label: "Validé", hint: "KYC complet, compagnie activée", icon: CheckCircle,
    dot: "bg-lime-500", tint: "bg-lime-500/[0.07]", badge: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300", ring: "ring-lime-400/60",
  },
  rejected: {
    label: "Rejeté", hint: "Dossiers refusés", icon: XCircle,
    dot: "bg-rose-500", tint: "bg-rose-500/[0.06]", badge: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300", ring: "ring-rose-400/60",
  },
};

export const DOC_DOT = {
  approved: "bg-lime-500", pending: "bg-amber-400", rejected: "bg-rose-500", missing: "bg-border",
} as const;
export const DOC_LABEL = { approved: "Approuvé", pending: "À revoir", rejected: "Rejeté", missing: "Manquant" } as const;
