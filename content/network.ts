export interface Region {
  country: string;
  note: string;
}

export const regions: Region[] = [
  { country: "Sénégal", note: "Réseau interurbain national et régional" },
  { country: "Côte d'Ivoire", note: "Lignes interurbaines et sous-régionales" },
  { country: "Mali", note: "Corridors interurbains et transfrontaliers" },
  { country: "Guinée", note: "Lignes intérieures et hub régionaux" },
  { country: "Burkina Faso", note: "Réseau interurbain en développement" },
];

export const networkFeatures: string[] = [
  "Gares, lignes et hubs modélisés pour chaque compagnie",
  "Trajets planifiés avec places disponibles en temps réel",
  "Position GPS des bus et suivi du carburant",
  "Ré-acheminement des colis via des hubs intermédiaires",
  "Couverture par compagnie, isolée des autres",
];
