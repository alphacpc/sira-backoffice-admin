import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function NotificationNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Notification introuvable</p>
        <Link href="/communication/notifications" className="mt-2 inline-block text-sm text-accent-text underline">
          Retour aux notifications
        </Link>
      </CardContent>
    </Card>
  );
}
