import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function UserNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Utilisateur introuvable</p>
        <Link href="/utilisateurs" className="mt-2 inline-block text-sm text-accent underline">
          Retour à la liste
        </Link>
      </CardContent>
    </Card>
  );
}
