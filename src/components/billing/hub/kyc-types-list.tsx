import {
  Bank, Buildings, Bus, FileText, Hash, IdentificationCard, Lightning, ShieldCheck, UserCheck, Warning,
} from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import { KycTypeToggle } from "@/app/(admin)/offre/types-documents-kyc/kyc-type-toggle";
import type { KycDocumentType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Icon = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;

const META: Record<string, { icon: Icon; description: string }> = {
  REGISTRATION: { icon: Buildings, description: "Extrait du registre du commerce de la compagnie" },
  NINEA: { icon: Hash, description: "Numéro d'identification nationale des entreprises" },
  TAX_CLEARANCE: { icon: Bank, description: "Attestation de régularité fiscale" },
  INSURANCE: { icon: ShieldCheck, description: "Attestation d'assurance couvrant la flotte" },
  TRANSPORT_LICENSE: { icon: Bus, description: "Licence d'exploitation de transport de voyageurs" },
  ID_MANAGER: { icon: IdentificationCard, description: "Pièce d'identité du dirigeant de la compagnie" },
};

function Ring({ done, total }: { done: number; total: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const ratio = total ? done / total : 0;
  return (
    <div className="relative size-28" role="img" aria-label={`${done} documents obligatoires actifs sur ${total}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-muted" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" className="stroke-lime-500" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{done}<span className="text-base font-medium text-muted-foreground">/{total}</span></span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">requis</span>
      </div>
    </div>
  );
}

function Row({ t, step }: { t: KycDocumentType; step: number | null }) {
  const meta = META[t.code] ?? { icon: FileText, description: "Document justificatif" };
  return (
    <li className={cn("flex items-center gap-4 px-5 py-4", !t.active && "bg-muted/40")}>
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", step ? "bg-[#0a2a47] text-white dark:bg-white dark:text-[#0a2a47]" : "bg-muted text-muted-foreground")}>
        {step ?? "–"}
      </span>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300">
        <meta.icon size={26} weight="duotone" aria-hidden />
      </span>
      <div className={cn("min-w-0 flex-1", !t.active && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold">{t.name}</h4>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", t.required ? "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300" : "bg-muted text-muted-foreground")}>
            {t.required ? "Obligatoire" : "Facultatif"}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{meta.description}</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground/80">{t.code}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span data-testid={`kyc-type-status-${t.code}`} className={cn("hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline", t.active ? "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300" : "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300")}>
          {t.active ? "Actif" : "Inactif"}
        </span>
        <KycTypeToggle code={t.code} name={t.name} active={t.active} />
      </div>
    </li>
  );
}

/** Verification checklist (like the onboarding flows of KYC providers) with a summary panel. */
export function KycTypesList({ types }: { types: KycDocumentType[] }) {
  const required = types.filter((t) => t.required && t.active);
  const requiredAll = types.filter((t) => t.required);
  const optional = types.filter((t) => !t.required && t.active);
  const disabled = types.filter((t) => !t.active);
  const sections = [
    { title: "Documents exigés", hint: "À approuver pour activer automatiquement une compagnie", items: required, numbered: true },
    { title: "Documents facultatifs", hint: "Acceptés, mais jamais bloquants", items: optional, numbered: false },
    { title: "Désactivés", hint: "Plus demandés aux compagnies", items: disabled, numbered: false },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_20rem]">
      <div className="space-y-5">
        {sections.map((s) => (
          <section key={s.title} aria-label={s.title} className="overflow-hidden rounded-2xl bg-white shadow-card dark:bg-card">
            <header className="border-b border-border bg-muted/50 px-5 py-3.5">
              <h3 className="font-semibold">{s.title} <span className="font-normal tabular-nums text-muted-foreground">· {s.items.length}</span></h3>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </header>
            <ul className="divide-y divide-border">
              {s.items.map((t, i) => <Row key={t.code} t={t} step={s.numbered ? i + 1 : null} />)}
            </ul>
          </section>
        ))}
        {sections.length === 0 && <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Aucun type de document.</p>}
      </div>

      <aside aria-label="Résumé" className="space-y-5 xl:sticky xl:top-4">
        <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
          <div className="flex items-center gap-4">
            <Ring done={required.length} total={Math.max(requiredAll.length, required.length)} />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold"><UserCheck size={18} weight="duotone" aria-hidden className="text-lime-600" /> Vérification</p>
              <p className="mt-1 text-sm text-muted-foreground">Documents obligatoires actifs</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Exigés", value: required.length }, { label: "Facultatifs", value: optional.length }, { label: "Désactivés", value: disabled.length },
            ].map((x) => (
              <div key={x.label} className="rounded-xl bg-muted/70 py-3">
                <dd className="text-xl font-bold tabular-nums">{x.value}</dd>
                <dt className="text-[11px] text-muted-foreground">{x.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-card dark:bg-card">
          <h3 className="text-sm font-semibold">Règles de vérification</h3>
          <p className="flex gap-3 text-sm text-muted-foreground"><Lightning size={20} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
            Une compagnie est activée automatiquement quand tous les documents exigés sont approuvés.</p>
          <p className="flex gap-3 text-sm text-muted-foreground"><Warning size={20} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
            Le dernier document obligatoire actif ne peut pas être désactivé.</p>
          <p className="flex gap-3 text-sm text-muted-foreground"><FileText size={20} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
            Désactiver un type conserve les documents déjà déposés.</p>
        </div>
      </aside>
    </div>
  );
}
