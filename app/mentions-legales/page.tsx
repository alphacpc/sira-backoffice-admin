import LegalLayout from "@/components/LegalLayout";
import { legalNotice } from "@/content/legal";

export default function MentionsLegalesPage() {
  return (
    <LegalLayout
      title="Mentions légales"
      intro="Informations légales relatives au site vitrine Sira."
      sections={legalNotice}
    />
  );
}
