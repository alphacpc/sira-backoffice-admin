import { describe, expect, it } from "vitest";
import { firstString } from "@/lib/search-params";

describe("firstString", () => {
  it("keeps a string", () => expect(firstString("abc")).toBe("abc"));
  it("treats a repeated param as absent", () => expect(firstString(["a", "b"])).toBeUndefined());
  it("treats a missing param as absent", () => expect(firstString(undefined)).toBeUndefined());
});
