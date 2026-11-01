export interface LegalSection {
  heading: string;
  body: string[];
}

// --- Mentions légales ---
export const legalNotice: LegalSection[] = [
  {
    heading: "Éditeur du site",
    body: [
      "Le site vitrine Sira est édité par l'équipe Sira.",
      "Contact : contact@sira.app",
      "Le site présente la plateforme Sira à titre d'information et de démonstration.",
    ],
  },
  {
    heading: "Hébergement",
    body: [
      "Le site est servi par un hébergeur standard. Les informations d'hébergement définitives seront précisées lors de la mise en production.",
    ],
  },
  {
    heading: "Propriété intellectuelle",
    body: [
      "Le contenu du site (textes, structure, éléments graphiques) est la propriété de Sira, sauf mention contraire. Toute reproduction sans autorisation est interdite.",
    ],
  },
  {
    heading: "Responsabilité",
    body: [
      "Ce site est un site de présentation. Les informations qu'il contient (fonctionnalités, tarifs) sont données à titre indicatif et peuvent évoluer. Sira ne saurait être tenue responsable d'une utilisation des informations du site à des fins contractuelles sans accord écrit préalable.",
    ],
  },
];

// --- Politique de confidentialité ---
export const privacyPolicy: LegalSection[] = [
  {
    heading: "Données collectées",
    body: [
      "Le site vitrine Sira ne collecte pas de données personnelles de façon automatique. Le formulaire de contact recueille les informations que vous saisissez volontairement (nom, email, compagnie, message).",
    ],
  },
  {
    heading: "Finalités",
    body: [
      "Les informations transmises via le formulaire de contact servent uniquement à vous répondre et à organiser une éventuelle démonstration. Elles ne sont ni vendues ni cédées à des tiers.",
    ],
  },
  {
    heading: "Base légale et consentement",
    body: [
      "En soumettant le formulaire, vous consentez au traitement de ces informations pour être recontacté. Vous pouvez retirer ce consentement à tout moment en nous écrivant à contact@sira.app.",
    ],
  },
  {
    heading: "Vos droits",
    body: [
      "Conformément à la loi sénégalaise n°2008-12 et au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et de portabilité de vos données. Pour l'exercer, écrivez à contact@sira.app.",
    ],
  },
  {
    heading: "Conservation",
    body: [
      "Les données du formulaire de contact sont conservées le temps nécessaire au traitement de votre demande, puis supprimées.",
    ],
  },
];

// --- Conditions générales d'utilisation ---
export const termsOfUse: LegalSection[] = [
  {
    heading: "Objet",
    body: [
      "Les présentes conditions encadrent l'utilisation du site vitrine Sira. En naviguant sur ce site, vous acceptez ces conditions.",
    ],
  },
  {
    heading: "Contenu informatif",
    body: [
      "Le site présente la plateforme Sira, ses fonctionnalités et ses tarifs, à titre indicatif. Ce contenu ne constitue pas une offre contractuelle.",
    ],
  },
  {
    heading: "Usage du site",
    body: [
      "Vous vous engagez à ne pas utiliser le site d'une manière qui pourrait l'endommager, le surcharger ou porter atteinte à son fonctionnement.",
    ],
  },
  {
    heading: "Propriété intellectuelle",
    body: [
      "Tous les éléments du site sont protégés. Toute reproduction, représentation ou exploitation non autorisée est interdite.",
    ],
  },
  {
    heading: "Droit applicable",
    body: [
      "Les présentes conditions sont soumises au droit applicable dans le pays de l'éditeur. En cas de litige, une solution amiable sera recherchée avant toute action.",
    ],
  },
];
