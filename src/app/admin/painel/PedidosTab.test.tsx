// @vitest-environment jsdom
// Aba Pedidos (Fase C): lê do DadosProvider, Confirmar/Recusar/Cancelar com Dialogo próprio
// e o mesmo padrão de abrir a aba do WhatsApp no toque (antes do await).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Agendamento } from "@/lib/db";
import { linkConfirmacao } from "@/lib/mensagens";
import PedidosTab from "./PedidosTab";

const HOJE = "2030-05-07";
vi.mock("@/lib/datas", async () => {
  const real = await vi.importActual<typeof import("@/lib/datas")>("@/lib/datas");
  return { ...real, hojeKeySalao: () => HOJE };
});

const banco = vi.hoisted(() => ({
  agendamentos: [] as Agendamento[],
  erros: { servicos: false, agenda: false, slots: false, agendamentos: false },
  confirmar: vi.fn(),
  recusar: vi.fn(),
}));
vi.mock("./DadosProvider", () => ({ useDados: () => ({ agendamentos: banco.agendamentos, erros: banco.erros }) }));
vi.mock("@/lib/db", () => ({
  confirmarAgendamento: banco.confirmar,
  recusarAgendamento: banco.recusar,
}));

const ag = (over: Partial<Agendamento> = {}): Agendamento => ({
  id: `${HOJE}_09:00`,
  servicos: [{ nome: "Esmaltação em gel", preco: 85 }],
  total: 85,
  clienteNome: "Bruna Lima",
  clienteWhatsapp: "15999998888",
  data: HOJE,
  hora: "09:00",
  diaLabel: "ter, 07/05",
  status: "pendente",
  ...over,
});

function janelaFalsa() {
  const win = { closed: false, close: vi.fn(), location: { href: "" } };
  const abrir = vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
  return { win, abrir };
}

beforeEach(() => {
  banco.agendamentos = [];
  banco.erros = { servicos: false, agenda: false, slots: false, agendamentos: false };
  banco.confirmar.mockReset().mockResolvedValue(undefined);
  banco.recusar.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PedidosTab", () => {
  it("mostra o estado vazio sem pedidos pendentes", () => {
    render(<PedidosTab />);
    expect(screen.getByText("Nenhum pedido pendente.")).toBeTruthy();
  });

  it("lista pendentes e confirmados (só os de hoje em diante) em grupos separados", () => {
    banco.agendamentos = [
      ag({ id: "p1", clienteNome: "Ana" }),
      ag({ id: "c1", clienteNome: "Carla", status: "confirmado", data: HOJE }),
      ag({ id: "c2", clienteNome: "Duda", status: "confirmado", data: "2030-05-01" }),
    ];
    render(<PedidosTab />);
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("Carla")).toBeTruthy();
    expect(screen.queryByText("Duda")).toBeNull();
    expect(screen.getByText("Confirmados")).toBeTruthy();
  });

  it("Confirmar abre a aba no toque e só manda pro WhatsApp depois de gravar", async () => {
    const pendente = ag();
    banco.agendamentos = [pendente];
    const { win, abrir } = janelaFalsa();
    let liberar!: () => void;
    banco.confirmar.mockImplementation(() => new Promise<void>((ok) => { liberar = ok; }));
    render(<PedidosTab />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(abrir).toHaveBeenCalledWith("", "_blank");
    expect(win.location.href).toBe("");
    liberar();
    await waitFor(() => expect(win.location.href).toBe(linkConfirmacao(pendente)));
  });

  it("Recusar pede confirmação num diálogo próprio (não o confirm nativo) antes de agir", () => {
    const confirmNativo = vi.spyOn(window, "confirm");
    banco.agendamentos = [ag()];
    render(<PedidosTab />);
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
    expect(confirmNativo).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "Recusar pedido" })).toBeTruthy();
    expect(banco.recusar).not.toHaveBeenCalled();
  });

  it("Recusar aceito no diálogo grava e abre o WhatsApp com a mensagem de recusa", async () => {
    const pendente = ag();
    banco.agendamentos = [pendente];
    const { win } = janelaFalsa();
    render(<PedidosTab />);
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Recusar" }).at(-1)!);
    await waitFor(() => expect(banco.recusar).toHaveBeenCalledWith(pendente.id));
    await waitFor(() => expect(win.location.href).toContain("wa.me/5515999998888"));
  });

  it("Cancelar um confirmado pede confirmação e grava + avisa a cliente", async () => {
    const confirmado = ag({ status: "confirmado" });
    banco.agendamentos = [confirmado];
    const { win } = janelaFalsa();
    render(<PedidosTab />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(banco.recusar).not.toHaveBeenCalled();
    // O diálogo não pode ter dois botões "Cancelar" (um voltando, outro cancelando o horário).
    const dialogo = screen.getByRole("alertdialog");
    expect([...dialogo.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Voltar", "Cancelar horário"]);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar horário" }));
    await waitFor(() => expect(banco.recusar).toHaveBeenCalledWith(confirmado.id));
    await waitFor(() => expect(decodeURIComponent(win.location.href)).toContain("cancelar"));
  });

  it("erro ao confirmar mostra mensagem humana", async () => {
    banco.agendamentos = [ag()];
    banco.confirmar.mockRejectedValue({ code: "unavailable" });
    janelaFalsa();
    render(<PedidosTab />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
  });

  it("mostra aviso quando a leitura de agendamentos falha", () => {
    banco.erros = { ...banco.erros, agendamentos: true };
    render(<PedidosTab />);
    expect(screen.getByText(/Não consegui carregar os pedidos/)).toBeTruthy();
  });
});
