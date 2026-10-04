// @vitest-environment jsdom
// Testes da lista "Agendamentos" do painel: pendentes, confirmados e os botões de WhatsApp.
// O banco (Firestore) e a abertura de abas do navegador são trocados por versões falsas.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { labelData } from "@/lib/utils";
import { linkConfirmacao } from "@/lib/mensagens";
import type { Agendamento } from "@/lib/db";
import AgendamentosManager from "./AgendamentosManager";

const banco = vi.hoisted(() => ({
  lista: [] as unknown[],
  confirmar: vi.fn(),
  recusar: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  ouvirAgendamentos: (cb: (lista: unknown[]) => void) => {
    cb(banco.lista);
    return () => {};
  },
  confirmarAgendamento: banco.confirmar,
  recusarAgendamento: banco.recusar,
}));

/** Data local "YYYY-MM-DD" de hoje + N dias. */
function dia(deslocamento: number) {
  const d = new Date();
  d.setDate(d.getDate() + deslocamento);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Um agendamento (confirmado, amanhã, 14:00, com WhatsApp) — cada teste muda o que precisa. */
function ag(extra: Partial<Agendamento> = {}): Agendamento {
  const data = extra.data ?? dia(1);
  return {
    id: `${data}_14:00`,
    servicos: [{ nome: "Alongamento", preco: 120 }],
    total: 120,
    clienteNome: "Ana Souza",
    clienteWhatsapp: "(15) 99999-8888",
    data,
    hora: "14:00",
    diaLabel: labelData(data),
    status: "confirmado",
    ...extra,
  };
}

/** A aba que o navegador abriria: dá para ver para onde ela foi apontada e se foi fechada. */
function janelaFalsa() {
  const win = { closed: false, close: vi.fn(), location: { href: "" } };
  const abrir = vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
  return { win, abrir };
}

beforeEach(() => {
  banco.lista = [];
  banco.confirmar.mockReset().mockResolvedValue(undefined);
  banco.recusar.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Confirmados: botão WhatsApp", () => {
  it("abre a conversa da cliente com a confirmação pronta (a mesma do Confirmar e do manual)", () => {
    const a = ag();
    banco.lista = [a];
    render(<AgendamentosManager />);

    const link = screen.getByRole("link", { name: "WhatsApp" });
    const href = link.getAttribute("href")!;
    expect(href).toBe(linkConfirmacao(a));
    expect(href.startsWith("https://wa.me/5515999998888?text=")).toBe(true);

    const msg = decodeURIComponent(href.split("?text=")[1]);
    expect(msg).toContain("Olá, Ana! Seu horário está *confirmado*.");
    expect(msg).toContain("• Alongamento — R$ 120");
    expect(msg).toContain(`*Quando:* ${a.diaLabel} às 14:00`);
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("cada confirmado leva a mensagem com o seu próprio nome e horário", () => {
    banco.lista = [
      ag({ id: "1", clienteNome: "Ana Souza", hora: "14:00" }),
      ag({ id: "2", clienteNome: "Bruna Lima", hora: "16:30", clienteWhatsapp: "(15) 98888-7777" }),
    ];
    render(<AgendamentosManager />);

    const [primeiro, segundo] = screen.getAllByRole("link", { name: "WhatsApp" });
    expect(decodeURIComponent(primeiro.getAttribute("href")!)).toContain("Olá, Ana!");
    expect(segundo.getAttribute("href")!.startsWith("https://wa.me/5515988887777?text=")).toBe(true);
    expect(decodeURIComponent(segundo.getAttribute("href")!)).toContain("Olá, Bruna!");
    expect(decodeURIComponent(segundo.getAttribute("href")!)).toContain("às 16:30");
  });

  it("sem WhatsApp cadastrado não mostra o botão, mas mantém o Cancelar", () => {
    banco.lista = [ag({ clienteWhatsapp: "" })];
    render(<AgendamentosManager />);

    expect(screen.queryByRole("link", { name: "WhatsApp" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });
});

describe("Lista: o que aparece", () => {
  it("confirmados de dias passados somem; hoje e os futuros ficam; pendentes antigos continuam", () => {
    banco.lista = [
      ag({ id: "a", data: dia(-1), clienteNome: "Ontem Confirmada" }),
      ag({ id: "b", data: dia(0), clienteNome: "Hoje Confirmada" }),
      ag({ id: "c", data: dia(2), clienteNome: "Futura Confirmada" }),
      ag({ id: "d", data: dia(-3), clienteNome: "Antiga Pendente", status: "pendente" }),
    ];
    render(<AgendamentosManager />);

    expect(screen.queryByText(/Ontem Confirmada/)).toBeNull();
    expect(screen.getByText(/Hoje Confirmada/)).toBeTruthy();
    expect(screen.getByText(/Futura Confirmada/)).toBeTruthy();
    expect(screen.getByText(/Antiga Pendente/)).toBeTruthy();
    expect(screen.getByText("Pendentes (1)")).toBeTruthy();
  });
});

describe("Confirmar (pedido pendente)", () => {
  it("abre a aba no toque, ANTES de gravar, e só depois manda pro WhatsApp", async () => {
    const pendente = ag({ status: "pendente" });
    banco.lista = [pendente];
    const { win, abrir } = janelaFalsa();
    let liberar!: () => void;
    banco.confirmar.mockImplementation(() => new Promise<void>((ok) => { liberar = ok; }));

    render(<AgendamentosManager />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    // no mesmo instante do toque, sem esperar o banco (senão o iPhone bloqueia a aba)
    expect(abrir).toHaveBeenCalledWith("", "_blank");
    expect(banco.confirmar).toHaveBeenCalledWith(pendente.id);
    expect(win.location.href).toBe("");

    liberar();
    await waitFor(() => expect(win.location.href).toBe(linkConfirmacao(pendente)));
  });

  it("se a gravação falhar, fecha a aba em branco e não abre o WhatsApp", async () => {
    banco.lista = [ag({ status: "pendente" })];
    const { win } = janelaFalsa();
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    banco.confirmar.mockRejectedValue({ code: "permission-denied" });

    render(<AgendamentosManager />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(win.close).toHaveBeenCalledTimes(1));
    expect(win.location.href).toBe("");
    expect(erro).toHaveBeenCalled();
  });

  it("sem WhatsApp, confirma sem abrir aba nenhuma", async () => {
    banco.lista = [ag({ status: "pendente", clienteWhatsapp: "" })];
    const { abrir } = janelaFalsa();

    render(<AgendamentosManager />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(banco.confirmar).toHaveBeenCalledTimes(1));
    expect(abrir).not.toHaveBeenCalled();
  });
});

describe("Cancelar (agendamento confirmado)", () => {
  it("depois de a dona aceitar o aviso, cancela e abre o WhatsApp com a mensagem de cancelamento", async () => {
    const a = ag();
    banco.lista = [a];
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { win } = janelaFalsa();

    render(<AgendamentosManager />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(win.location.href).toContain("https://wa.me/5515999998888?text="));
    expect(banco.recusar).toHaveBeenCalledWith(a.id);
    expect(decodeURIComponent(win.location.href)).toContain("cancelar");
  });

  it("se a dona desistir no aviso, nada acontece", () => {
    banco.lista = [ag()];
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { abrir } = janelaFalsa();

    render(<AgendamentosManager />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(banco.recusar).not.toHaveBeenCalled();
    expect(abrir).not.toHaveBeenCalled();
  });
});
