// Données de présence à compléter avec vos gares et compagnies clientes réelles.
// x / y = position du point sur la carte (en %), alignée sur /images/carte-afrique-ouest.png.
export interface PresenceLocation {
  id: string;
  city: string;
  country: string;
  x: number; // position du point sur la carte (%)
  y: number;
  stations: string[];
  companies: string[];
}

export const presenceLocations: PresenceLocation[] = [
  {
    id: "senegal",
    city: "Dakar",
    country: "Sénégal",
    x: 17.5,
    y: 27.6,
    stations: ["Gare routière de Petersen — Dakar", "Hub régional de Thiès"],
    companies: ["Sénégal Voyages", "Dakar Transport"],
  },
  {
    id: "guinee",
    city: "Conakry",
    country: "Guinée",
    x: 29.7,
    y: 56.4,
    stations: ["Gare de Madina — Conakry", "Terminal de Bambeto"],
    companies: ["Conakry Express", "Guinée Lines"],
  },
  {
    id: "cote-ivoire",
    city: "Abidjan",
    country: "Côte d'Ivoire",
    x: 75.5,
    y: 80.6,
    stations: ["Gare d'Adjamé — Abidjan", "Terminal de Yamoussoukro"],
    companies: ["Ivoire Transit", "Abidjan Coaches"],
  },
];
