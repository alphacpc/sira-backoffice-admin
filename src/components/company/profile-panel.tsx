import {
  Buildings, CalendarCheck, CalendarPlus, Coins, Envelope, Globe, Hash, IdentificationCard, Phone, Scroll, Trophy,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ContactField } from "@/components/company/contact-field";
import { StatusBadge } from "@/components/data/status-badge";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDate } from "@/lib/format";
import { companyStatusBadge } from "@/lib/labels";
import { maskEmail, maskPhone } from "@/lib/mask";
import type { CompanyDetail } from "@/lib/types";

type IconType = ComponentType<{ size?: number; weight?: "duotone" | "fill"; "aria-hidden"?: boolean; className?: string }>;

function countryLabel(code: string) {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return { flag: "", name: code };
  const flag = String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
  const name = new Intl.DisplayNames(["fr"], { type: "region" }).of(cc) ?? cc;
  return { flag, name };
}

const TIER_STYLE: Record<string, string> = {
  GOLD: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  SILVER: "bg-zinc-200 text-zinc-700 dark:bg-zinc-400/15 dark:text-zinc-300",
  STANDARD: "bg-muted text-muted-foreground",
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${TIER_STYLE[tier.toUpperCase()] ?? "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300"}`}>
      <Trophy size={14} weight="fill" aria-hidden />{tier}
    </span>
  );
}

function Field({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={24} weight="duotone" aria-hidden className="mt-0.5 shrink-0 text-orange-500" />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words text-sm font-semibold">{children}</dd>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-5 shadow-card">
      <h3 className="mb-5 text-sm font-semibold">{title}</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

export function ProfilePanel({ company: c, employees = [] }: { company: CompanyDetail["company"]; employees?: CompanyDetail["employees"] }) {
  const manager = employees.find((e) => e.role === "MANAGER");
  const status = companyStatusBadge(c.status);
  const dash = <span className="text-muted-foreground">—</span>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-5 shadow-card">
        <CompanyAvatar name={c.name} size="lg" className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold tracking-tight">{c.name}</h2>
          <p className="mt-0.5 font-mono text-sm text-muted-foreground">{c.slug}.sira.app</p>
        </div>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>

      <section className="rounded-card border border-border bg-card p-5 shadow-card">
        <h3 className="mb-5 text-sm font-semibold">Gestionnaire de la compagnie</h3>
        {manager ? (
          <div className="flex flex-wrap items-center gap-4">
            <CompanyAvatar name={manager.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">
                {manager.userId ? <Link href={`/utilisateurs/${manager.userId}`} className="hover:underline">{manager.name}</Link> : manager.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{manager.userId ? "Compte plateforme actif" : "Pas encore de compte plateforme"}</p>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <Field icon={Envelope} label="E-mail">{maskEmail(manager.email)}</Field>
              <Field icon={Phone} label="Téléphone">{maskPhone(manager.phone)}</Field>
            </dl>
          </div>
        ) : <p className="text-sm text-muted-foreground">Aucun gestionnaire désigné.</p>}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Contact">
          <Field icon={Envelope} label="E-mail de contact"><ContactField companyId={c.id} field="email" masked={maskEmail(c.contactEmail)} /></Field>
          <Field icon={Phone} label="Téléphone"><ContactField companyId={c.id} field="phone" masked={maskPhone(c.contactPhone)} /></Field>
          <Field icon={Globe} label="Pays">{!c.country.trim() ? "—" : (() => { const k = countryLabel(c.country); return <span className="flex items-center gap-2"><span aria-hidden className="text-lg leading-none">{k.flag}</span>{k.name} <span className="font-normal text-muted-foreground">({c.country})</span></span>; })()}</Field>
          <Field icon={Coins} label="Devise">{c.currency.trim() || "—"}</Field>
        </Section>

        <Section title="Informations légales">
          <Field icon={Scroll} label="Registre du commerce">{c.registrationNumber || dash}</Field>
          <Field icon={IdentificationCard} label="NINEA">{c.ninea || dash}</Field>
          <Field icon={Hash} label="Identifiant">{c.slug}</Field>
          <Field icon={Trophy} label="Palier partenaire">{c.partnerTier ? <TierBadge tier={c.partnerTier} /> : dash}</Field>
        </Section>
      </div>

      <Section title="Historique">
        <Field icon={CalendarPlus} label="Créée le">{formatDate(c.createdAt)}</Field>
        <Field icon={CalendarCheck} label="Activée le">{c.activatedAt ? formatDate(c.activatedAt) : dash}</Field>
      </Section>
    </div>
  );
}
