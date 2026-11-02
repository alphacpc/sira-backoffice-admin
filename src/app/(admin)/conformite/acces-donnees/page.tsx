import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { ACCESS_TYPES, DATA_CATEGORIES, accessRepo } from "@/lib/repos/compliance";
import { AccessTable } from "./access-table";

export const dynamic = "force-dynamic";

const BASE = "/conformite/acces-donnees";
const TYPE_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "VIEW", label: "Consultations" },
  { value: "EXPORT", label: "Exports" },
  { value: "MODIFY", label: "Modifications" },
];
const CATEGORY_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes les catégories" },
  { value: "IDENTITY", label: "Identité" },
  { value: "CONSENT", label: "Consentement" },
];

export default async function DataAccessPage({
  searchParams,
}: { searchParams: Promise<{ type?: string; categorie?: string }> }) {
  const sp = await searchParams;
  const accessType = parseFilter(sp.type, ACCESS_TYPES);
  const category = parseFilter(sp.categorie, DATA_CATEGORIES);
  const keep = { type: accessType, categorie: category };
  return (
    <>
      <PageHeader
        title="Accès aux données"
        description="Qui a consulté, exporté ou modifié des données personnelles, pour quel motif. Journal en lecture seule ; les adresses IP sont tronquées."
      />
      <StatusFilterNav basePath={BASE} options={TYPE_OPTIONS} current={accessType} param="type" keep={keep} label="Filtrer par type d'accès" />
      <StatusFilterNav basePath={BASE} options={CATEGORY_OPTIONS} current={category} param="categorie" keep={keep} label="Filtrer par catégorie" />
      <AccessTable lines={accessRepo.listRows({ accessType, category })} />
    </>
  );
}
