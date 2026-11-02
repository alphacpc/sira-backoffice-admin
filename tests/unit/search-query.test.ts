import { describe, expect, it } from "vitest";
import {
  CONTACT_QUERY_MESSAGE, isContactLike, matchRank, MAX_QUERY, normalizeText, queryProblem,
} from "@/lib/search-query";

describe("normalizeText", () => {
  it("lowercases, strips accents and collapses spaces", () => {
    expect(normalizeText("  Aïssatou   SARR ")).toBe("aissatou sarr");
    expect(normalizeText("Thiès Éléphant")).toBe("thies elephant");
    expect(normalizeText("")).toBe("");
  });
  it("keeps hyphens and digits", () => {
    expect(normalizeText("BK-8F3A21")).toBe("bk-8f3a21");
  });
});

describe("matchRank", () => {
  it("ranks exact, prefix, word start and inside matches, null otherwise", () => {
    expect(matchRank("Aïssatou Sarr", "aissatou sarr")).toBe(0);
    expect(matchRank("Aïssatou Sarr", "aissatou")).toBe(1);
    expect(matchRank("Aïssatou Sarr", "sarr")).toBe(2);
    expect(matchRank("Aïssatou Sarr", "ssa")).toBe(3);
    expect(matchRank("Aïssatou Sarr", "diop")).toBeNull();
  });
  it("treats hyphen, underscore, dot and slash as word starts", () => {
    expect(matchRank("louga-trans", "trans")).toBe(2);
    expect(matchRank("a_b", "b")).toBe(2);
    expect(matchRank("moustapha.ndiaye", "ndiaye")).toBe(2);
    expect(matchRank("a/b", "b")).toBe(2);
    expect(matchRank("abc", "bc")).toBe(3);
  });
  it("matches codes by prefix", () => {
    expect(matchRank("BK-8F3A21", "bk-")).toBe(1);
    expect(matchRank("BK-8F3A21", "8f3a")).toBe(2);
  });
});

describe("isContactLike", () => {
  it("detects e-mail addresses and phone numbers", () => {
    expect(isContactLike("someone@example.sn")).toBe(true);
    expect(isContactLike("@x")).toBe(true);
    expect(isContactLike("+221 77 123 45 67")).toBe(true);
    expect(isContactLike("(221) 77.123.45.67")).toBe(true);
    expect(isContactLike("7712345")).toBe(true);
  });
  it("accepts names, codes and short numbers", () => {
    expect(isContactLike("Aïssatou Sarr")).toBe(false);
    expect(isContactLike("BK-12345678")).toBe(false);
    expect(isContactLike("TRK-0123456789")).toBe(false);
    expect(isContactLike("771234")).toBe(false);
    expect(isContactLike("+22 1")).toBe(false);
  });
});

describe("isContactLike bypass hardening", () => {
  it.each([
    "someone＠example.sn", "７７１２３４５６７", "＋221 77 123 45 67", "٧٧١٢٣٤٥٦٧",
    "77/123/45/67", "77_123_45_67", "77\u200b123\u200c45\u200d67\ufeff12", "tel:771234567", "tel 771234567", "Tel: 77 123 45 67",
  ])("refuses %s", (q) => {
    expect(isContactLike(q)).toBe(true);
    expect(queryProblem(q)).toBe(CONTACT_QUERY_MESSAGE);
  });
  it.each([
    "BK-12345678", "SYS-12345678", "sira-co-12345678", "550e8400-e29b-41d4-a716-446655440000",
    "TRK-0123456789", "PCL-20260101-0042", "MNT-1011", "INV-2026-000123", "TK-8F3A21", "tel:12345",
  ])("still accepts the code %s", (q) => {
    expect(isContactLike(q)).toBe(false);
    expect(queryProblem(q)).toBeNull();
  });
});

describe("queryProblem", () => {
  it("accepts a valid query", () => {
    expect(queryProblem("louga")).toBeNull();
    expect(queryProblem("  ab  ")).toBeNull();
    expect(queryProblem("x".repeat(MAX_QUERY))).toBeNull();
  });
  it("refuses a query that is too short after trimming", () => {
    expect(queryProblem("")).toBe("Saisis au moins 2 caractères");
    expect(queryProblem("   ")).toBe("Saisis au moins 2 caractères");
    expect(queryProblem(" a ")).toBe("Saisis au moins 2 caractères");
    expect(queryProblem("@")).toBe("Saisis au moins 2 caractères");
  });
  it("refuses a query that is too long", () => {
    expect(queryProblem("x".repeat(MAX_QUERY + 1))).toBe("La recherche est trop longue (100 caractères maximum)");
  });
  it("refuses contact-like queries with the contact message", () => {
    expect(CONTACT_QUERY_MESSAGE).toBe("La recherche par e-mail ou téléphone n'est pas disponible : utilise un nom, un code ou un identifiant.");
    expect(queryProblem("someone@example.sn")).toBe(CONTACT_QUERY_MESSAGE);
    expect(queryProblem("+221 77 123 45 67")).toBe(CONTACT_QUERY_MESSAGE);
  });
  it("checks too short, then too long, then contact", () => {
    expect(queryProblem("@")).toBe("Saisis au moins 2 caractères");
    expect(queryProblem(`${"@".repeat(MAX_QUERY)}x`)).toBe("La recherche est trop longue (100 caractères maximum)");
  });
});
