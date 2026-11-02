import { beforeEach, describe, expect, it } from "vitest";
import { busesRepo } from "@/lib/repos/fleet";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const bus = (plate: string) => getStore().buses.find((b) => b.plate === plate)!;
const retire = (plate: string, reason = "Moteur hors d'usage") =>
  busesRepo.retire(bus(plate).id, reason, "tester@sira.app", NOW);

describe("retiring a bus", () => {
  it("retires an active bus with no maintenance in progress and no trip to come, and journals it", () => {
    // DK-1051-AB: a departed and a cancelled trip, a completed and a cancelled maintenance.
    const target = bus("DK-1051-AB");
    const before = { next: target.nextMaintenanceDate, driver: target.driverId, controller: target.controllerId };
    const n = getStore().activity.length;
    const result = retire("DK-1051-AB", "  Moteur hors d'usage  ");
    expect(result).toBe(target);
    expect(target.status).toBe("retired");
    expect(target.retiredAt).toBe(NOW.toISOString());
    expect(target.nextMaintenanceDate).toBe(before.next);
    expect([target.driverId, target.controllerId]).toEqual([before.driver, before.controller]);
    expect(target.driverId).not.toBeNull();
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: "Bus DK-1051-AB mis hors service. Motif : Moteur hors d'usage",
    });
  });

  it("retires a bus in maintenance once its maintenance is no longer in progress", () => {
    const target = bus("DK-1040-AB");
    for (const m of getStore().maintenances) if (m.busId === target.id && m.status === "IN_PROGRESS") m.status = "COMPLETED";
    retire("DK-1040-AB");
    expect(target.status).toBe("retired");
  });

  it("refuses an unknown bus", () => {
    const n = getStore().activity.length;
    expect(() => busesRepo.retire("nope", "motif", "tester@sira.app", NOW)).toThrow("Bus introuvable");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a blank reason and changes nothing", () => {
    expect(() => retire("DK-1051-AB", "   ")).toThrow("Un motif est obligatoire");
    expect(bus("DK-1051-AB").status).toBe("active");
    expect(bus("DK-1051-AB").retiredAt).toBeNull();
  });

  it("refuses a bus that is already retired", () => {
    const target = bus("DK-1023-AB");
    const retiredAt = target.retiredAt;
    const n = getStore().activity.length;
    expect(() => retire("DK-1023-AB")).toThrow("Ce bus est déjà hors service");
    expect(target.retiredAt).toBe(retiredAt);
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a bus with a maintenance in progress", () => {
    expect(() => retire("DK-1040-AB")).toThrow("Une maintenance est en cours sur ce bus");
    expect(bus("DK-1040-AB").status).toBe("maintenance");
  });

  it("refuses a bus with a planned trip, and a bus whose only trip to come is boarding", () => {
    expect(() => retire("DK-1050-AB")).toThrow("Ce bus a des trajets à venir");
    expect(bus("DK-1050-AB").status).toBe("active");
    const boarding = bus("DK-1022-AB");
    for (const t of getStore().trips) if (t.busId === boarding.id && t.status === "planned") t.status = "departed";
    expect(getStore().trips.filter((t) => t.busId === boarding.id).map((t) => t.status).sort()).toEqual(["boarding", "departed"]);
    expect(() => retire("DK-1022-AB")).toThrow("Ce bus a des trajets à venir");
    expect(boarding.status).toBe("active");
  });

  it("checks the guards in order: reason, then already retired, then maintenance, then trips", () => {
    const retired = bus("DK-1023-AB");
    expect(() => retire("DK-1023-AB", " ")).toThrow("Un motif est obligatoire");
    getStore().maintenances.push({ ...getStore().maintenances[0]!, id: "m-extra", busId: retired.id, status: "IN_PROGRESS" });
    expect(() => retire("DK-1023-AB")).toThrow("Ce bus est déjà hors service");

    const inMaintenance = bus("DK-1040-AB");
    getStore().trips.push({ ...getStore().trips[0]!, id: "t-extra", busId: inMaintenance.id, status: "planned" });
    expect(() => retire("DK-1040-AB")).toThrow("Une maintenance est en cours sur ce bus");
  });

  it("never writes an e-mail or a phone number into the activity log", () => {
    retire("DK-1051-AB", "Contrôle signalé");
    for (const a of getStore().activity) expect(a.action).not.toMatch(/@|\+221\d/);
  });
});
