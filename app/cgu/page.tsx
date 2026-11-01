import LegalLayout from "@/components/LegalLayout";
import { termsOfUse } from "@/content/legal";

export default function CguPage() {
  return (
    <LegalLayout
      title="Conditions générales d'utilisation"
      intro="Les conditions qui encadrent l'utilisation de ce site vitrine."
      sections={termsOfUse}
    />
  );
}
