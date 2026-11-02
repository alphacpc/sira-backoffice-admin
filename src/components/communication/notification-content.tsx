"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { revealNotificationContent } from "@/app/(admin)/communication/actions";
import { Button } from "@/components/ui/button";

/** Scalars only: the content comes from the journaled server action, on demand. */
export function NotificationContent({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [content, setContent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setBusy(true);
    setError(null);
    try {
      const r = await revealNotificationContent(notificationId);
      if (!r.ok) throw new Error(r.error);
      setContent(r.value);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'afficher le contenu");
    } finally {
      setBusy(false);
    }
  }

  if (content !== null) {
    return (
      <div className="space-y-2">
        <p data-testid="notification-content" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{content}</p>
        <Button variant="secondary" size="sm" onClick={() => setContent(null)}>Masquer le contenu</Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Le contenu est une donnée personnelle : il est masqué et son affichage est journalisé.
      </p>
      <Button size="sm" onClick={reveal} disabled={busy}>Afficher le contenu</Button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
