import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function PlanNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Plan introuvable</p>
        <Link href="/offre/plans" className="mt-2 inline-block text-sm text-accent-text underline">
          Retour aux plans
        </Link>
      </CardContent>
    </Card>
  );
}
