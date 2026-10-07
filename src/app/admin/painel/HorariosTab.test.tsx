// @vitest-environment jsdom
// Aba Horários (Fase C): uma linha por dia da semana + próximas folgas, lendo do DadosProvider.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Agenda } from "@/lib/db";
import { labelData } from "@/lib/utils";
import HorariosTab from "./HorariosTab";

const HOJE = "2030-05-07"; // terça-feira
vi.mock("@/lib/datas", async () => {
  const real = await vi.importActual<typeof import("@/lib/datas")>("@/lib/datas");
  return { ...real, hojeKeySalao: () => HOJE };
});

const banco = vi.hoisted(() => ({
  agenda: { dias: {}, bloqueios: [] } as Agenda,
  erros: { servicos: false, agenda: false, slots: false, agendamentos: false },
  salvarAntecedencia: vi.fn(),
}));
vi.mock("./DadosProvider", () => ({ useDados: () => banco }));
vi.mock("@/lib/db", () => ({ salvarAntecedencia: banco.salvarAntecedencia }));
vi.mock("./FolhaHorarioDia", () => ({
  default: ({ diaK, diaLabel, onFechar }: { diaK: string; diaLabel: string; onFechar: () => void }) => (
    <div data-testid="folha-horario-dia" data-dia-k={diaK} data-dia-label={diaLabel}>
      <button onClick={onFechar}>fechar folha</button>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  banco.agenda = { dias: {}, bloqueios: [] };
  banco.erros = { servicos: false, agenda: false, slots: false, agendamentos: false };
  banco.salvarAntecedencia.mockReset();
});

describe("Até quando as clientes podem marcar", () => {
  const opcao = (nome: string) => screen.getByRole("button", { name: nome });

  it("sem escolha salva, '2 semanas' vem marcado e mostra a data-limite", () => {
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    expect(opcao("2 semanas").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("As clientes veem a agenda até 21 de maio.")).toBeTruthy(); // 07/05 + 14
    expect(screen.queryByText(/marque as folgas do período/)).toBeNull();
  });

  it("tocar em '3 meses' salva 90 dias", async () => {
    banco.salvarAntecedencia.mockResolvedValue(undefined);
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    fireEvent.click(opcao("3 meses"));
    await waitFor(() => expect(banco.salvarAntecedencia).toHaveBeenCalledWith(90));
  });

  it("com 3 meses salvos, mostra a data-limite e lembra de marcar as folgas", () => {
    banco.agenda = { dias: {}, bloqueios: [], antecedenciaDias: 90 };
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    expect(opcao("3 meses").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("As clientes veem a agenda até 5 de agosto.")).toBeTruthy(); // 07/05 + 90
    expect(screen.getByText(/marque as folgas do período/)).toBeTruthy();
  });

  it("tocar na opção que já está marcada não salva de novo", () => {
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    fireEvent.click(opcao("2 semanas"));
    expect(banco.salvarAntecedencia).not.toHaveBeenCalled();
  });

  it("falha ao salvar mostra mensagem humana", async () => {
    banco.salvarAntecedencia.mockRejectedValue({ code: "unavailable" });
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    fireEvent.click(opcao("1 mês"));
    expect(await screen.findByText(/conexão|internet/i)).toBeTruthy();
  });
});

describe("HorariosTab", () => {
  it("lista os 7 dias da semana, começando na segunda", () => {
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    const linhas = screen.getAllByRole("button", { name: /Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo/ });
    expect(linhas).toHaveLength(7);
    expect(linhas[0].textContent).toContain("Segunda");
    expect(linhas[6].textContent).toContain("Domingo");
  });

  it("dia sem horários mostra 'Sem atendimento'", () => {
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    expect(screen.getAllByText("Sem atendimento").length).toBeGreaterThan(0);
  });

  it("dia com horários resume início, fim e contagem", () => {
    banco.agenda = { dias: { "1": ["09:00", "10:00", "18:00"] }, bloqueios: [] };
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    expect(screen.getByText(/09:00 às 18:00 · 3 horários/)).toBeTruthy();
  });

  it("toca num dia abre a folha de edição dele", () => {
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Sexta/ }));
    const folha = screen.getByTestId("folha-horario-dia");
    expect(folha.getAttribute("data-dia-k")).toBe("5");
    expect(folha.getAttribute("data-dia-label")).toBe("Sexta");
  });

  it("sem folgas futuras mostra o estado vazio", () => {
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    expect(screen.getByText(/Nenhuma folga marcada/)).toBeTruthy();
  });

  it("lista só as folgas de hoje em diante, em ordem", () => {
    banco.agenda = { dias: {}, bloqueios: ["2030-05-20", "2030-05-01", "2030-05-10"] };
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    expect(screen.queryByText(labelData("2030-05-01"))).toBeNull();
    const folgas = screen.getAllByText(new RegExp(`^(${labelData("2030-05-10")}|${labelData("2030-05-20")})$`));
    expect(folgas.map((el) => el.textContent?.trim())).toEqual([labelData("2030-05-10"), labelData("2030-05-20")]);
  });

  it("tocar numa folga chama onVerNoDia com a data", () => {
    banco.agenda = { dias: {}, bloqueios: ["2030-05-20"] };
    const onVerNoDia = vi.fn();
    render(<HorariosTab onVerNoDia={onVerNoDia} />);
    fireEvent.click(screen.getByRole("button", { name: /20\/05/ }));
    expect(onVerNoDia).toHaveBeenCalledWith("2030-05-20");
  });

  it("mostra aviso quando a leitura da agenda falha", () => {
    banco.erros = { ...banco.erros, agenda: true };
    render(<HorariosTab onVerNoDia={vi.fn()} />);
    expect(screen.getByText(/Não consegui carregar os horários/)).toBeTruthy();
  });
});
