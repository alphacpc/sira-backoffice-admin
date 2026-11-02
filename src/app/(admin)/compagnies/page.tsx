import { CompaniesHub } from "./companies-hub";

export const dynamic = "force-dynamic";

export default async function CompagniesPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  return <CompaniesHub view="all" statut={statut} />;
}
