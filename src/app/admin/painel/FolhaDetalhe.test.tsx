// @vitest-environment jsdom
// Testes da folha de Detalhe: pedido (Confirmar/Recusar) e confirmado (WhatsApp/Cancelar),
// incluindo o padrão "abre a aba antes do await" que resolve o bloqueio de popup do iPhone.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { linkConfirmacao } from "@/lib/mensagens";
import type { Agendamento } from "@/lib/db";
import FolhaDetalhe from "./FolhaDetalhe";

const banco = vi.hoisted(() => ({
  confirmar: vi.fn(),
  recusar: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  confirmarAgendamento: banco.confirmar,
  recusarAgendamento: banco.recusar,
}));

const ag = (over: Partial<Agendamento> = {}): Agendamento => ({
  id: "2030-05-10_09:00",
  servicos: [{ nome: "Esmaltação em gel", preco: 85 }],
  total: 85,
  clienteNome: "Bruna Lima",
  clienteWhatsapp: "(15) 99999-8888",
  data: "2030-05-10",
  hora: "09:00",
  diaLabel: "sex, 10/05",
  status: "confirmado",
  ...over,
});

function janelaFalsa() {
  const win = { closed: false, close: vi.fn(), location: { href: "" } };
  const abrir = vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
  return { win, abrir };
}

beforeEach(() => {
  banco.confirmar.mockReset().mockResolvedValue(undefined);
  banco.recusar.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Pedido (status pendente)", () => {
  it("mostra Confirmar e Recusar, sem o link de reenviar", () => {
    render(<FolhaDetalhe agendamento={ag({ status: "pendente" })} onFechar={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Recusar" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Enviar confirmação/ })).toBeNull();
  });

  it("Confirmar abre a aba no toque e só manda pro WhatsApp depois de gravar", async () => {
    const pendente = ag({ status: "pendente" });
    const { win, abrir } = janelaFalsa();
    let liberar!: () => void;
    banco.confirmar.mockImplementation(() => new Promise<void>((ok) => { liberar = ok; }));
    const onFechar = vi.fn();

    render(<FolhaDetalhe agendamento={pendente} onFechar={onFechar} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(abrir).toHaveBeenCalledWith("", "_blank");
    expect(banco.confirmar).toHaveBeenCalledWith(pendente.id);
    expect(win.location.href).toBe("");

    liberar();
    await waitFor(() => expect(win.location.href).toBe(linkConfirmacao(pendente)));
    expect(onFechar).toHaveBeenCalledOnce();
  });

  it("Confirmar com falha mostra mensagem humana e não fecha a folha", async () => {
    banco.confirmar.mockRejectedValue({ code: "unavailable" });
    janelaFalsa();
    const onFechar = vi.fn();
    render(<FolhaDetalhe agendamento={ag({ status: "pendente" })} onFechar={onFechar} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("Recusar pede confirmação num diálogo próprio (não o confirm() nativo) e só age se aceitar", async () => {
    const confirmNativo = vi.spyOn(window, "confirm");
    const onFechar = vi.fn();
    render(<FolhaDetalhe agendamento={ag({ status: "pendente" })} onFechar={onFechar} />);
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
    expect(confirmNativo).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "Recusar pedido" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(banco.recusar).not.toHaveBeenCalled();
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("Recusar aceito no diálogo grava e abre o WhatsApp com a mensagem de recusa", async () => {
    const pendente = ag({ status: "pendente" });
    const { win } = janelaFalsa();
    render(<FolhaDetalhe agendamento={pendente} onFechar={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
    const botoes = screen.getAllByRole("button", { name: "Recusar" });
    fireEvent.click(botoes[botoes.length - 1]);
    await waitFor(() => expect(banco.recusar).toHaveBeenCalledWith(pendente.id));
    await waitFor(() => expect(win.location.href).toContain("wa.me/5515999998888"));
  });
});

describe("Agendamento confirmado", () => {
  it("mostra o link de reenviar confirmação e o botão Cancelar horário", () => {
    const c = ag();
    render(<FolhaDetalhe agendamento={c} onFechar={vi.fn()} />);
    const link = screen.getByRole("link", { name: /Enviar confirmação/ });
    expect(link.getAttribute("href")).toBe(linkConfirmacao(c));
    expect(screen.getByRole("button", { name: "Cancelar horário" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
  });

  it("sem WhatsApp cadastrado, não mostra o link", () => {
    render(<FolhaDetalhe agendamento={ag({ clienteWhatsapp: "" })} onFechar={vi.fn()} />);
    expect(screen.queryByRole("link", { name: /Enviar confirmação/ })).toBeNull();
  });

  it("Cancelar horário pede confirmação num diálogo próprio e grava + avisa a cliente ao aceitar", async () => {
    const c = ag();
    const confirmNativo = vi.spyOn(window, "confirm");
    const { win } = janelaFalsa();
    render(<FolhaDetalhe agendamento={c} onFechar={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar horário" }));
    expect(confirmNativo).not.toHaveBeenCalled();
    expect(banco.recusar).not.toHaveBeenCalled();
    const botoes = screen.getAllByRole("button", { name: "Cancelar horário" });
    fireEvent.click(botoes[botoes.length - 1]);
    await waitFor(() => expect(banco.recusar).toHaveBeenCalledWith(c.id));
    await waitFor(() => expect(decodeURIComponent(win.location.href)).toContain("cancelar"));
  });
});
