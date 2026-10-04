// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Agenda, ServicoDoc, SlotDoc } from "@/lib/db";
import FolhaAgendar from "./FolhaAgendar";

const banco = vi.hoisted(() => ({
  dados: {
    servicos: [] as ServicoDoc[],
    agenda: { dias: {}, bloqueios: [] } as Agenda,
    slots: [] as SlotDoc[],
    agendamentos: [],
    carregando: false,
    erros: { servicos: false, agenda: false, slots: false, agendamentos: false },
  },
  criarAgendamentoManual: vi.fn(),
}));

vi.mock("./DadosProvider", () => ({ useDados: () => banco.dados }));
vi.mock("@/lib/db", () => ({ criarAgendamentoManual: banco.criarAgendamentoManual }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

const DIA = "2030-05-10";
const HORA = "09:00";

beforeEach(() => {
  banco.dados = {
    servicos: [
      { id: "1", nome: "Esmaltação em gel", desc: "", preco: 85, destaque: false },
      { id: "2", nome: "Alongamento em fibra", desc: "", preco: 150, destaque: false, duracaoMin: 90 },
    ],
    agenda: { dias: { "5": ["09:00", "09:30", "10:00", "11:00"] }, bloqueios: [] }, // 2030-05-10 é sexta
    slots: [],
    agendamentos: [],
    carregando: false,
    erros: { servicos: false, agenda: false, slots: false, agendamentos: false },
  };
  banco.criarAgendamentoManual.mockReset().mockResolvedValue(`${DIA}_${HORA}`);
});
afterEach(() => cleanup());

describe("FolhaAgendar", () => {
  it("mostra o dia e a hora já escolhidos (sem campo de data)", () => {
    render(<FolhaAgendar data={DIA} hora={HORA} onFechar={vi.fn()} onCriado={vi.fn()} />);
    expect(screen.queryByLabelText("Data")).toBeNull();
    expect(screen.getByText(/às 09:00/)).toBeTruthy();
  });

  it("sem nome, mostra erro e não salva", async () => {
    render(<FolhaAgendar data={DIA} hora={HORA} onFechar={vi.fn()} onCriado={vi.fn()} />);
    fireEvent.click(screen.getByText("Esmaltação em gel"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar agendamento" }));
    expect(await screen.findByText("Coloque o nome da cliente.")).toBeTruthy();
    expect(banco.criarAgendamentoManual).not.toHaveBeenCalled();
  });

  it("salva com o dia/hora recebidos e calcula bloquearApos pela duração", async () => {
    const onCriado = vi.fn();
    const onFechar = vi.fn();
    render(<FolhaAgendar data={DIA} hora={HORA} onFechar={onFechar} onCriado={onCriado} />);
    fireEvent.change(screen.getByLabelText("Nome da cliente"), { target: { value: "Bruna Lima" } });
    fireEvent.change(screen.getByLabelText("WhatsApp (opcional)"), { target: { value: "15999998888" } });
    fireEvent.click(screen.getByText("Alongamento em fibra")); // 90min → come as 09:30 e 10:00
    fireEvent.click(screen.getByRole("button", { name: "Salvar agendamento" }));

    await waitFor(() => expect(banco.criarAgendamentoManual).toHaveBeenCalledOnce());
    const [novo, bloquearApos] = banco.criarAgendamentoManual.mock.calls[0];
    expect(novo).toMatchObject({ data: DIA, hora: HORA, clienteNome: "Bruna Lima", total: 150 });
    expect(bloquearApos).toEqual(["09:30", "10:00"]);
    expect(onCriado).toHaveBeenCalledWith("Bruna", expect.any(String));
    expect(onFechar).toHaveBeenCalledOnce();
  });

  it("serviço sem espaço (duração invade horário já ocupado) impede salvar", async () => {
    banco.dados.slots = [{ id: `${DIA}_09:30`, data: DIA, hora: "09:30", status: "confirmado" }];
    render(<FolhaAgendar data={DIA} hora={HORA} onFechar={vi.fn()} onCriado={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nome da cliente"), { target: { value: "Bruna" } });
    fireEvent.click(screen.getByText("Alongamento em fibra"));
    expect(await screen.findByText("Esse serviço não cabe: o horário seguinte já está ocupado.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Salvar agendamento" }));
    expect(banco.criarAgendamentoManual).not.toHaveBeenCalled();
  });

  it("horário ocupado por outra pessoa entre abrir e salvar: mensagem específica", async () => {
    banco.criarAgendamentoManual.mockRejectedValue({ code: "horario-ocupado" });
    render(<FolhaAgendar data={DIA} hora={HORA} onFechar={vi.fn()} onCriado={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nome da cliente"), { target: { value: "Bruna" } });
    fireEvent.click(screen.getByText("Esmaltação em gel"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar agendamento" }));
    expect(await screen.findByText("Esse horário acabou de ser ocupado. Escolha outro.")).toBeTruthy();
  });
});
