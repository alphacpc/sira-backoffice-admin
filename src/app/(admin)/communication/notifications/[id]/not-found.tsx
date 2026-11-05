import { NotFoundView } from "@/components/data/not-found-view";

export default function CommunicationNotificationsNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Notification introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/communication/notifications" backLabel="Retour aux notifications"
    />
  );
}
