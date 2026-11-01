import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { formatMoney } from "@/lib/format";
import {
  EXPIRATION_DELAY_DAYS, SUSPENSION_DELAY_DAYS, subscriptionsRepo,
} from "@/lib/repos/billing";
import { UnpaidTable } from "./unpaid-table";

export const dynamic = "force-dynamic";

export default function UnpaidPage() {
  const rows = subscriptionsRepo.unpaidQueue(new Date());
  const pastDue = rows.filter((r) => r.status === "past_due").length;
  const suspended = rows.length - pastDue;
  const total = rows.reduce((sum, r) => sum + r.price, 0);
  return (
    <>
      <PageHeader
        title="Impayés"
        description="Abonnements impayés ou suspendus, du plus urgent au moins urgent."
      />
      <section aria-label="Indicateurs des impayés" className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Abonnements impayés" value={pastDue} tone={pastDue ? "danger" : "default"} />
        <KpiCard label="Abonnements suspendus" value={suspended} tone={suspended ? "warning" : "default"} />
        <KpiCard label="Montant en souffrance" value={formatMoney(total, rows[0]?.currency ?? "XOF")} />
        <KpiCard
          label="Délais appliqués"
          value={`${SUSPENSION_DELAY_DAYS} j / ${EXPIRATION_DELAY_DAYS} j`}
          hint={`Suspension ${SUSPENSION_DELAY_DAYS} jours après l'impayé, expiration ${EXPIRATION_DELAY_DAYS} jours après la suspension.`}
        />
      </section>
      <UnpaidTable rows={rows} />
    </>
  );
}
