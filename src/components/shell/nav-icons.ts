import {
  Armchair, ArrowsClockwise, Bell, Buildings, Bus, CalendarCheck, CalendarDots, ChartBar, ChatCircleText,
  CheckSquare, Circle, ClipboardText, Clock, CreditCard, EnvelopeSimple, Eye, FileText,
  Globe, House, Hourglass, IdentificationBadge, IdentificationCard, Key, MagnifyingGlass, Medal, Megaphone,
  MapPin, Money, Notebook, Package, Path, Plugs, Pulse, PuzzlePiece, Receipt, Scales, ShieldStar, Signpost,
  Siren, Stack, Star, Storefront, Ticket, TreeStructure, UserCircle, UserGear, Users, UsersFour, Wallet,
  WarningCircle, Wrench,
} from "@phosphor-icons/react/dist/ssr";

export type IconComponent = typeof Circle;

const ITEM_ICONS: Record<string, IconComponent> = {
  "/": House, "/recherche": MagnifyingGlass,
  "/compagnies": Buildings, "/compagnies/kyc": IdentificationCard,
  "/offre/plans": Stack, "/offre/fonctionnalites": PuzzlePiece, "/offre/paliers-partenaires": Medal,
  "/offre/types-documents-kyc": FileText,
  "/facturation/abonnements": ArrowsClockwise, "/facturation/paiements": CreditCard,
  "/facturation/factures": Receipt, "/facturation/impayes": WarningCircle,
  "/utilisateurs": Users, "/acces/roles": UserGear, "/acces/permissions": Key, "/acces/sessions": Clock,
  "/flotte/bus": Bus, "/flotte/flottes": TreeStructure, "/flotte/gares": MapPin, "/flotte/lignes": Path,
  "/flotte/trajets": Signpost, "/flotte/plans-de-sieges": Armchair, "/flotte/maintenance": Wrench,
  "/flotte/fournisseurs": Storefront,
  "/ventes/reservations": CalendarCheck, "/ventes/paiements": Money, "/ventes/billets": Ticket,
  "/ventes/moyens-de-paiement": Wallet, "/ventes/en-ligne": Globe,
  "/colis": Package, "/clients/comptes": UserCircle, "/clients/fidelite": Star, "/clients/avis": ChatCircleText,
  "/communication/notifications": Bell, "/communication/campagnes": Megaphone, "/communication/segments": UsersFour,
  "/communication/messages": EnvelopeSimple, "/communication/programmations": CalendarDots,
  "/conformite/journal-audit": ClipboardText, "/conformite/acces-donnees": Eye, "/conformite/demandes-rgpd": Scales,
  "/conformite/consentements": CheckSquare, "/conformite/retention": Hourglass,
  "/supervision/services": Pulse, "/supervision/incidents": Siren, "/supervision/api": Plugs, "/supervision/usage": ChartBar,
  "/parametres/profil": IdentificationBadge, "/parametres/equipe-admin": ShieldStar,
  "/parametres/journal-backoffice": Notebook,
};

export function iconForHref(href: string): IconComponent {
  return ITEM_ICONS[href] ?? Circle;
}
