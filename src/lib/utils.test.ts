import { describe, it, expect } from "vitest";
import { brl, wppUrl, proximosDias } from "./utils";

describe("brl", () => {
  it("formata inteiro com prefixo R$", () => {
    expect(brl(85)).toBe("R$ 85");
  });
  it("usa vírgula como separador decimal", () => {
    expect(brl(34.5)).toBe("R$ 34,5");
  });
  it("lida com zero", () => {
    expect(brl(0)).toBe("R$ 0");
  });
});

describe("wppUrl", () => {
  it("monta o link wa.me com o texto codificado", () => {
    expect(wppUrl("5511999998888", "Olá, tudo bem?")).toBe(
      "https://wa.me/5511999998888?text=Ol%C3%A1%2C%20tudo%20bem%3F",
    );
  });
});

describe("proximosDias", () => {
  it("retorna a quantidade pedida de dias", () => {
    expect(proximosDias(14)).toHaveLength(14);
  });
  it("começa a partir de amanhã (não inclui hoje)", () => {
    const hojeKey = new Date().toISOString().slice(0, 10);
    const dias = proximosDias(5);
    expect(dias.some((d) => d.key === hojeKey)).toBe(false);
  });
  it("gera keys no formato YYYY-MM-DD e weekday válido (0–6)", () => {
    for (const d of proximosDias(10)) {
      expect(d.key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.weekday).toBeGreaterThanOrEqual(0);
      expect(d.weekday).toBeLessThanOrEqual(6);
    }
  });
});
