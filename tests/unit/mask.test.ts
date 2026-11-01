import { describe, expect, it } from "vitest";
import { maskEmail, maskPhone } from "@/lib/mask";

describe("maskEmail", () => {
  it("keeps first char and domain", () => {
    expect(maskEmail("awa.diop@sahel.sn")).toBe("a•••@sahel.sn");
  });
  it("handles short or invalid values without throwing", () => {
    expect(maskEmail("a@b.sn")).toBe("a•••@b.sn");
    expect(maskEmail("no-at-sign")).toBe("••••");
    expect(maskEmail("")).toBe("••••");
  });
});

describe("maskPhone", () => {
  it("keeps the country prefix and last two digits", () => {
    expect(maskPhone("+221771230000")).toBe("+221•••••••00");
  });
  it("masks everything but the last two digits when there is no prefix", () => {
    expect(maskPhone("771230000")).toBe("•••••••00");
    expect(maskPhone("")).toBe("••••");
  });
});
