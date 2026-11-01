import LegalLayout from "@/components/LegalLayout";
import { privacyPolicy } from "@/content/legal";

export default function ConfidentialitePage() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      intro="Comment vos données sont traitées lorsque vous utilisez ce site vitrine."
      sections={privacyPolicy}
    />
  );
}
