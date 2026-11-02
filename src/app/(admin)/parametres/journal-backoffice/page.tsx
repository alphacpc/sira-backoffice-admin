import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import { JOURNAL_LIMIT, JOURNAL_WINDOWS, journalRepo } from "@/lib/repos/backoffice";
import { JournalTable } from "./journal-table";

export const dynamic = "force-dynamic";

const BASE = "/parametres/journal-backoffice";
const WINDOW_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toute la période" },
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "90", label: "90 jours" },
];

export default async function BackofficeJournalPage({
  searchParams,
}: { searchParams: Promise<{ acteur?: string; jours?: string; revelations?: string }> }) {
  const sp = await searchParams;
  const actors = journalRepo.actors();
  const actor = parseFilter(sp.acteur, actors);
  const daysText = parseFilter(sp.jours, JOURNAL_WINDOWS.map(String));
  const days = daysText ? Number(daysText) : undefined;
  const revealsOnly = sp.revelations === "1";
  const keep = { acteur: actor, jours: daysText, revelations: revealsOnly ? "1" : undefined };
  const now = new Date();
  const stats = journalRepo.stats(now);
  const rows = journalRepo.list({ actor, days, revealsOnly }, now);
  return (
    <>
      <PageHeader
        title="Journal du backoffice"
        description={`Actions des administrateurs, de la plus récente à la plus ancienne (${JOURNAL_LIMIT} entrées au plus). Aucune donnée personnelle n'y figure.`}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div data-testid="journal-entries"><KpiCard label="Entrées sur 7 jours" value={formatNumber(stats.entries7d)} /></div>
        <div data-testid="journal-actors"><KpiCard label="Acteurs sur 7 jours" value={formatNumber(stats.actors7d)} /></div>
        <div data-testid="journal-reveals"><KpiCard label="Révélations de données sur 30 jours" value={formatNumber(stats.reveals30d)} /></div>
      </div>
      <StatusFilterNav
        basePath={BASE} param="acteur" current={actor} keep={keep} label="Filtrer par acteur"
        options={[{ value: "all", label: "Tous les acteurs" }, ...actors.map((a) => ({ value: a, label: a }))]}
      />
      <StatusFilterNav basePath={BASE} param="jours" current={daysText} keep={keep} label="Choisir la période" options={WINDOW_OPTIONS} />
      <StatusFilterNav
        basePath={BASE} param="revelations" current={revealsOnly ? "1" : undefined} keep={keep} label="Filtrer par type"
        options={[{ value: "all", label: "Toutes les actions" }, { value: "1", label: "Révélations de données" }]}
      />
      <JournalTable rows={rows} />
    </>
  );
}
