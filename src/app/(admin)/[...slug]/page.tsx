import { notFound } from "next/navigation";
import { PageHeader } from "@/components/data/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { allNavItems, isKnownPath } from "@/lib/nav";

export const dynamic = "force-dynamic";

export default async function ComingSoonPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  if (!isKnownPath(path)) notFound();
  const item = allNavItems().find((i) => i.href === path)!;
  return (
    <>
      <PageHeader title={item.label} />
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-medium">Bientôt disponible</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cet écran fait partie d&apos;un prochain lot du backoffice.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
