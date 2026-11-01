import type { ChapterId } from "@/content/solution";
import { BrowserFrame, PhoneShell } from "./Frame";
import FleetMock from "./FleetMock";
import SeatMapMock from "./SeatMapMock";
import ParcelTrackingMock from "./ParcelTrackingMock";
import StaffMock from "./StaffMock";
import SupervisionMock from "./SupervisionMock";

export default function ChapterMock({ id }: { id: ChapterId }) {
  switch (id) {
    case "flotte":
      return (
        <BrowserFrame url="app.sira.app/flotte">
          <FleetMock />
        </BrowserFrame>
      );
    case "billetterie":
      return (
        <BrowserFrame url="app.sira.app/trajets/plan-de-sieges">
          <div className="bg-cream p-6">
            <SeatMapMock />
          </div>
        </BrowserFrame>
      );
    case "colis":
      return (
        <PhoneShell>
          <ParcelTrackingMock />
        </PhoneShell>
      );
    case "equipes":
      return (
        <BrowserFrame url="app.sira.app/rh/employes">
          <StaffMock />
        </BrowserFrame>
      );
    case "pilotage":
      return (
        <BrowserFrame url="app.sira.app/supervision">
          <SupervisionMock />
        </BrowserFrame>
      );
  }
}
