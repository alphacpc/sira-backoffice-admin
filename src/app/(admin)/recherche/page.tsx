import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav } from "@/components/data/status-filter-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseFilter } from "@/lib/filters";
import { SEARCH_TYPES, searchRepo } from "@/lib/repos/search";
import { CONTACT_QUERY_MESSAGE, isContactLike, PAGE_LIMIT, queryProblem } from "@/lib/search-query";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; type?: string; refus?: string }> }) {
  const sp = await searchParams;
  const raw = (sp.q ?? "").trim();
  // A contact-like value never stays in the URL or on the page.
  if (raw && isContactLike(raw)) redirect("/recherche?refus=contact");

  const problem = sp.refus === "contact" ? CONTACT_QUERY_MESSAGE : raw ? queryProblem(raw) : null;
  const result = raw && !problem ? searchRepo.search(raw, { limitPerType: PAGE_LIMIT }) : null;
  const type = parseFilter(sp.type, SEARCH_TYPES);
  const shown = result ? result.groups.filter((g) => !type || g.type === type) : [];
  const grandTotal = result ? result.groups.reduce((n, g) => n + g.total, 0) : 0;

  return (
    <>
      <PageHeader
        title="Recherche"
        description="Cherche un nom, un code ou un identifiant dans toute la plateforme. Les e-mails et les numéros de téléphone ne sont pas recherchables."
      />
      <form action="/recherche" method="get" role="search" className="mb-4 flex gap-2">
        <Input
          name="q" aria-label="Rechercher dans le backoffice" placeholder="Nom, code, identifiant…"
          defaultValue={raw && !problem ? raw : ""} className="max-w-md" autoComplete="off"
        />
        <Button type="submit">Rechercher</Button>
      </form>

      {!raw && !problem && (
        <p data-testid="search-help" className="text-sm text-muted-foreground">
          Exemples : un nom de compagnie, un code de réservation (BK-…), de billet (TK-…), de colis (PCL-…) ou d&apos;incident (SYS-…).
        </p>
      )}
      {problem && <p role="alert" data-testid="search-problem" className="text-sm text-danger">{problem}</p>}

      {result && (
        <>
          {result.groups.length > 0 && (
            <StatusFilterNav
              basePath="/recherche" param="type" current={type} keep={{ q: raw }} label="Filtrer par type"
              options={[
                { value: "all", label: `Tous (${grandTotal})` },
                ...result.groups.map((g) => ({ value: g.type, label: `${g.label} (${g.total})` })),
              ]}
            />
          )}
          {shown.length === 0 && (
            <p data-testid="search-empty" className="text-sm text-muted-foreground">
              {result.groups.length === 0 ? "Aucun résultat pour cette recherche." : "Aucun résultat dans ce type."}
            </p>
          )}
          <div className="space-y-4">
            {shown.map((g) => (
              <Card key={g.type} data-testid={`search-group-${g.type}`}>
                <CardHeader><CardTitle>{g.label} · {g.total}</CardTitle></CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {g.hits.map((h) => (
                      <li key={h.id} data-testid="search-hit" className="py-2">
                        <Link href={h.href} className="font-medium hover:underline">{h.label}</Link>
                        <span className="ml-2 text-sm text-muted-foreground">{h.sublabel}</span>
                      </li>
                    ))}
                  </ul>
                  {g.total > g.hits.length && (
                    <p data-testid="search-more" className="mt-2 text-xs text-muted-foreground">
                      {g.total - g.hits.length} autre(s) résultat(s) : affine la recherche.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
