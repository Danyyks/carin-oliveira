// Testes da mensagem de confirmação enviada à cliente pelo WhatsApp.
// Cobrem o link usado tanto no "Confirmar" do site quanto no agendamento manual.
import { describe, it, expect } from "vitest";
import { linkConfirmacao, msgConfirmacao } from "./mensagens";
import { studio } from "@/config/studio";
import type { Agendamento } from "./db";

const base: Agendamento = {
  id: "2030-05-07_14:00",
  servicos: [{ nome: "Alongamento", preco: 120 }],
  total: 120,
  clienteNome: "Ana Souza",
  clienteWhatsapp: "(15) 99999-8888",
  data: "2030-05-07",
  hora: "14:00",
  diaLabel: "ter, 07/05",
  status: "confirmado",
};

/** Texto da mensagem que vai dentro do link (já decodificado). */
const texto = (url: string) => decodeURIComponent(url.split("?text=")[1]);

describe("linkConfirmacao", () => {
  it("monta o link do wa.me para o número da cliente com a mensagem pronta", () => {
    const url = linkConfirmacao(base)!;
    expect(url.startsWith("https://wa.me/5515999998888?text=")).toBe(true);
    expect(texto(url)).toBe(msgConfirmacao(base));
  });

  it("a mensagem traz saudação, serviço, dia e hora, endereço e como chegar", () => {
    const msg = texto(linkConfirmacao(base)!);
    expect(msg).toContain("Olá, Ana! Seu horário está *confirmado*.");
    expect(msg).toContain("*Serviço*");
    expect(msg).toContain("• Alongamento — R$ 120");
    expect(msg).toContain("*Quando:* ter, 07/05 às 14:00");
    expect(msg).toContain(`*Onde:* ${studio.enderecoTexto}`);
    expect(msg).toContain("Como chegar: https://www.google.com/maps/search/");
  });

  it("com vários serviços lista todos e mostra o total", () => {
    const ag: Agendamento = {
      ...base,
      servicos: [
        { nome: "Alongamento", preco: 120 },
        { nome: "Nail art", preco: 45 },
      ],
      total: 165,
    };
    const msg = texto(linkConfirmacao(ag)!);
    expect(msg).toContain("*Serviços*");
    expect(msg).toContain("• Alongamento — R$ 120");
    expect(msg).toContain("• Nail art — R$ 45");
    expect(msg).toContain("*Total: R$ 165*");
  });

  it("usa só o primeiro nome da cliente na saudação", () => {
    const msg = texto(linkConfirmacao({ ...base, clienteNome: "  Maria Fernanda Lima " })!);
    expect(msg).toContain("Olá, Maria!");
  });

  it("aceita o número em qualquer formato digitado e não duplica o 55", () => {
    const numero = (w: string) => linkConfirmacao({ ...base, clienteWhatsapp: w })!.split("?")[0];
    expect(numero("15 99999-8888")).toBe("https://wa.me/5515999998888");
    expect(numero("+55 (15) 99999-8888")).toBe("https://wa.me/5515999998888");
    expect(numero("5515999998888")).toBe("https://wa.me/5515999998888");
  });

  it("cliente do DDD 55 (RS) digitada sem DDI não é confundida com o código do país", () => {
    const numero = (w: string) => linkConfirmacao({ ...base, clienteWhatsapp: w })!.split("?")[0];
    expect(numero("(55) 99999-8888")).toBe("https://wa.me/5555999998888");
  });

  it("sem WhatsApp (campo opcional do agendamento manual) devolve null", () => {
    expect(linkConfirmacao({ ...base, clienteWhatsapp: "" })).toBeNull();
    expect(linkConfirmacao({ ...base, clienteWhatsapp: "   " })).toBeNull();
    expect(linkConfirmacao({ ...base, clienteWhatsapp: "sem número" })).toBeNull();
  });
});
