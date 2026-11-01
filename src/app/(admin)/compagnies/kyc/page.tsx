import { PageHeader } from "@/components/data/page-header";
import { companiesRepo } from "@/lib/repos/companies";
import { KycQueueTable } from "./kyc-queue-table";

export const dynamic = "force-dynamic";

export default function KycQueuePage() {
  return (
    <>
      <PageHeader
        title="File de revue KYC"
        description="Documents en attente de revue, toutes compagnies confondues, du plus ancien au plus récent."
      />
      <KycQueueTable items={companiesRepo.kycQueue()} />
    </>
  );
}
