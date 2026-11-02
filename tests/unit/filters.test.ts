import { describe, expect, it } from "vitest";
import { parseFilter, serviceFilterHref } from "@/lib/filters";

describe("parseFilter", () => {
  const allowed = ["paid", "failed"] as const;
  it("returns an allowed value", () => {
    expect(parseFilter("failed", allowed)).toBe("failed");
  });
  it("returns undefined for a missing or unknown value", () => {
    expect(parseFilter(undefined, allowed)).toBeUndefined();
    expect(parseFilter("all", allowed)).toBeUndefined();
    expect(parseFilter("PAID", allowed)).toBeUndefined();
  });
});

import { filterHref } from "@/lib/filters";
describe("filterHref", () => {
  it("sets the parameter and clears it for all, like the lot 2 links", () => {
    expect(filterHref("/facturation/abonnements", "statut", "past_due")).toBe("/facturation/abonnements?statut=past_due");
    expect(filterHref("/facturation/abonnements", "statut", "all")).toBe("/facturation/abonnements");
  });
  it("keeps the other filters and drops undefined ones", () => {
    expect(filterHref("/utilisateurs", "role", "ADMIN", { statut: "suspended" })).toBe("/utilisateurs?statut=suspended&role=ADMIN");
    expect(filterHref("/utilisateurs", "role", "all", { statut: "suspended" })).toBe("/utilisateurs?statut=suspended");
    expect(filterHref("/utilisateurs", "statut", "active", { role: undefined })).toBe("/utilisateurs?statut=active");
  });
  it("never keeps a stale value of the parameter it sets", () => {
    expect(filterHref("/utilisateurs", "role", "USER", { role: "ADMIN" })).toBe("/utilisateurs?role=USER");
  });
});

describe("serviceFilterHref", () => {
  it("percent-encodes the service name", () => {
    expect(serviceFilterHref("/supervision/services", "booking-service")).toBe("/supervision/services?service=booking-service");
    const href = serviceFilterHref("/supervision/incidents", "a b&c=d");
    expect(href).toBe("/supervision/incidents?service=a%20b%26c%3Dd");
    expect(new URL(href, "http://x").searchParams.get("service")).toBe("a b&c=d");
  });
});
