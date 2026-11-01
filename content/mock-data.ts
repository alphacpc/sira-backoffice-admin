export type Tone = "ok" | "warn" | "idle";

export const mockTrips = [
  { id: "t1", route: "Dakar → Saint-Louis", departure: "06:30", seats: "12 / 54", status: "Embarquement", tone: "warn" as Tone, price: "5 000 F" },
  { id: "t2", route: "Dakar → Thiès", departure: "08:00", seats: "31 / 54", status: "Planifié", tone: "idle" as Tone, price: "2 500 F" },
  { id: "t3", route: "Dakar → Touba", departure: "09:15", seats: "0 / 54", status: "Complet", tone: "ok" as Tone, price: "4 000 F" },
  { id: "t4", route: "Thiès → Kaolack", departure: "11:40", seats: "22 / 54", status: "Planifié", tone: "idle" as Tone, price: "3 000 F" },
];

export const mockBuses = [
  { plate: "DK-1234-A", model: "Autocar 54 places", state: "En service", tone: "ok" as Tone },
  { plate: "DK-5678-B", model: "Autocar 54 places", state: "En maintenance", tone: "warn" as Tone },
  { plate: "DK-9012-C", model: "Minibus 28 places", state: "En service", tone: "ok" as Tone },
  { plate: "DK-3456-D", model: "Autocar 54 places", state: "En service", tone: "ok" as Tone },
];

export const mockMaintenanceSteps = ["Planifiée", "En cours", "Terminée"];

export const mockParcelSteps = [
  { label: "Colis enregistré", detail: "Gare de départ", time: "08:10" },
  { label: "En transit", detail: "Trajet 06:30", time: "08:45" },
  { label: "Au hub", detail: "Transbordement", time: "12:20" },
  { label: "Livré", detail: "Gare d'arrivée", time: "—" },
];

export const mockStaff = [
  { name: "A. Diop", role: "Chauffeur", status: "Actif", tone: "ok" as Tone },
  { name: "M. Fall", role: "Contrôleur", status: "Actif", tone: "ok" as Tone },
  { name: "S. Ndiaye", role: "Agent de guichet", status: "Congé demandé", tone: "warn" as Tone },
  { name: "K. Ba", role: "Mécanicien", status: "Actif", tone: "ok" as Tone },
];

export const mockServices = [
  { name: "Identité", tone: "ok" as Tone },
  { name: "Flotte", tone: "ok" as Tone },
  { name: "Réservations", tone: "ok" as Tone },
  { name: "Colis", tone: "ok" as Tone },
  { name: "Équipes", tone: "ok" as Tone },
  { name: "Clients", tone: "warn" as Tone },
  { name: "Notifications", tone: "ok" as Tone },
  { name: "Conformité", tone: "ok" as Tone },
];
