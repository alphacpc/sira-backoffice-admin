import Link from "next/link";
import { ContactField } from "@/components/company/contact-field";
import { LimitsPanel } from "@/components/company/limits-panel";
import { SubscriptionPanel } from "@/components/company/subscription-panel";
import { ActivityPanel, FleetPanel, ReferralPanel, RetentionPanel, TeamPanel } from "@/components/company/more-panels";
import { UsagePanel } from "@/components/company/usage-panel";
import { ProfilePanel } from "@/components/company/profile-panel";
import { KycPanel } from "@/components/company/kyc-panel";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney, formatNumber, nextBillingLabel } from "@/lib/format";
import { busStatusBadge, companyStatusBadge, invoiceStatusBadge, subscriptionStatusBadge } from "@/lib/labels";
import { maskEmail, maskPhone } from "@/lib/mask";
import type { CompanyDetail } from "@/lib/types";

const TAB_VALUES = ["profil", "kyc", "abonnement", "fonctionnalites", "utilisation", "parrainage", "retention", "equipe", "flotte", "activite"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function CompanyTabs({ detail, initialTab, canReplaceKycFile = false }: { detail: CompanyDetail; initialTab?: string; canReplaceKycFile?: boolean }) {
  const { company: c, subscription: sub } = detail;
  const status = companyStatusBadge(c.status);

  const items = [
    {
      value: "profil", label: "Profil",
      content: (
        <ProfilePanel company={c} employees={detail.employees} />
      ),
    },
    { value: "kyc", label: "Vérification KYC", content: <KycPanel canReplace={canReplaceKycFile} company={{ id: c.id, name: c.name, status: c.status, forceActivated: c.forceActivated }} documents={detail.documents} kycTypes={detail.kycTypes.map((t) => ({ code: t.code, name: t.name, required: t.required, active: t.active }))} /> },
    {
      value: "abonnement", label: "Abonnement et paiements",
      content: <SubscriptionPanel detail={detail} />,
    },
    {
      value: "fonctionnalites", label: "Fonctionnalités et limites",
      content: detail.limits ? (
        <LimitsPanel detail={detail} />
      ) : <Empty>Aucun plan souscrit : pas de limites ni de fonctionnalités.</Empty>,
    },
    {
      value: "utilisation", label: "Utilisation",
      content: <UsagePanel detail={detail} />,
    },
    {
      value: "parrainage", label: "Parrainage et crédits",
      content: <ReferralPanel detail={detail} />,
    },
    {
      value: "retention", label: "Rétention des données",
      content: <RetentionPanel days={c.dataRetentionDays} />,
    },
    {
      value: "equipe", label: "Équipe",
      content: <TeamPanel detail={detail} />,
    },
    {
      value: "flotte", label: "Flotte et trajets",
      content: <FleetPanel detail={detail} />,
    },
    {
      value: "activite", label: "Activité",
      content: <ActivityPanel detail={detail} />,
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "profil";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
