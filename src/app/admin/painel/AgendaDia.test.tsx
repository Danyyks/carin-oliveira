// @vitest-environment jsdom
// Testes da Agenda por dia (painel novo): estados da linha, faixa da semana, banner de
// pedidos, folga e as ações já seguras de reaproveitar (Bloquear/Liberar).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Agendamento, Agenda, SlotDoc } from "@/lib/db";
import AgendaDia from "./AgendaDia";

const banco = vi.hoisted(() => ({
  dados: {
    agenda: { dias: {}, bloqueios: [] } as Agenda,
    slots: [] as SlotDoc[],
    agendamentos: [] as Agendamento[],
    carregando: false,
    servicos: [],
    erros: { servicos: false, agenda: false, slots: false, agendamentos: false },
  },
  liberarHorarios: vi.fn(),
  bloquearHorarios: vi.fn(),
}));

vi.mock("./DadosProvider", () => ({ useDados: () => banco.dados }));
vi.mock("@/lib/db", () => ({
  liberarHorarios: banco.liberarHorarios,
  bloquearHorarios: banco.bloquearHorarios,
}));
vi.mock("../FolhaBloquear", () => ({
  default: ({ dataInicial, onFechar }: { dataInicial?: string; onFechar: () => void }) => (
    <div data-testid="folha-bloquear" data-data-inicial={dataInicial}>
      <button onClick={onFechar}>fechar folha</button>
    </div>
  ),
}));
vi.mock("./FolhaAgendar", () => ({
  default: ({
    data,
    hora,
    onFechar,
    onCriado,
  }: {
    data: string;
    hora: string;
    onFechar: () => void;
    onCriado: (nome: string, link: string | null) => void;
  }) => (
    <div data-testid="folha-agendar" data-data={data} data-hora={hora}>
      <button onClick={() => { onCriado("Fulana", "https://wa.me/x"); onFechar(); }}>criar fake</button>
      <button onClick={onFechar}>fechar folha agendar</button>
    </div>
  ),
}));
vi.mock("./FolhaDetalhe", () => ({
  default: ({ agendamento, onFechar }: { agendamento: Agendamento; onFechar: () => void }) => (
    <div data-testid="folha-detalhe" data-id={agendamento.id}>
      <button onClick={onFechar}>fechar folha detalhe</button>
    </div>
  ),
}));

// "Hoje" fixo em 2030-05-07 (terça-feira), no fuso do salão, pra todos os testes.
const HOJE = "2030-05-07";
vi.mock("@/lib/datas", async () => {
  const real = await vi.importActual<typeof import("@/lib/datas")>("@/lib/datas");
  return {
    ...real,
    hojeKeySalao: () => HOJE,
    agoraNoSalao: () => new Date(2030, 4, 7, 15, 0, 0),
  };
});

const ag = (over: Partial<Agendamento> = {}): Agendamento => ({
  id: `${HOJE}_10:00`,
  servicos: [{ nome: "Esmaltação", preco: 50 }],
  total: 50,
  clienteNome: "Bruna Lima",
  clienteWhatsapp: "15999998888",
  data: HOJE,
  hora: "10:00",
  diaLabel: "ter, 07/05",
  status: "confirmado",
  ...over,
});

beforeEach(() => {
  banco.dados = {
    agenda: { dias: { "2": ["09:00", "10:00", "14:00"] }, bloqueios: [] }, // terça = "2"
    slots: [],
    agendamentos: [],
    carregando: false,
    servicos: [],
    erros: { servicos: false, agenda: false, slots: false, agendamentos: false },
  };
  banco.liberarHorarios.mockReset().mockResolvedValue({ liberados: [{ data: HOJE, hora: "09:00" }], ignorados: [] });
  banco.bloquearHorarios.mockReset().mockResolvedValue({ feitos: [], ignorados: [] });
});
afterEach(() => cleanup());

describe("Carregando", () => {
  it("mostra o aviso de carregando", () => {
    banco.dados = { ...banco.dados, carregando: true };
    render(<AgendaDia />);
    expect(screen.getByText("Carregando a agenda…")).toBeTruthy();
  });
});

describe("Título e resumo do dia", () => {
  it("hoje mostra 'Hoje' e o resumo por contagem", () => {
    banco.dados.agendamentos = [ag({ status: "confirmado" }), ag({ id: `${HOJE}_14:00`, hora: "14:00", status: "pendente" })];
    banco.dados.slots = [
      { id: `${HOJE}_10:00`, data: HOJE, hora: "10:00", status: "confirmado" },
      { id: `${HOJE}_14:00`, data: HOJE, hora: "14:00", status: "pendente" },
    ];
    render(<AgendaDia />);
    expect(screen.getByText("Hoje")).toBeTruthy();
    expect(screen.getByText("1 confirmado · 1 pedido")).toBeTruthy();
  });

  it("sem nada no dia, mostra 'Nenhum agendamento'", () => {
    render(<AgendaDia />);
    expect(screen.getByText("Nenhum agendamento")).toBeTruthy();
  });
});

describe("Estados da linha", () => {
  it("horário livre mostra 'Livre'", () => {
    // agora (mockado) é 15:00 — usa um horário futuro pra não cair no filtro de "passou".
    banco.dados.agenda = { dias: { "2": ["16:00"] }, bloqueios: [] };
    render(<AgendaDia />);
    expect(screen.getByText("Livre")).toBeTruthy();
  });

  it("confirmado mostra o nome, o serviço e o botão de WhatsApp", () => {
    banco.dados.agendamentos = [ag()];
    banco.dados.slots = [{ id: `${HOJE}_10:00`, data: HOJE, hora: "10:00", status: "confirmado" }];
    render(<AgendaDia />);
    expect(screen.getByText("Bruna")).toBeTruthy();
    expect(screen.getByText(/Esmaltação · R\$ 50/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toBeTruthy();
  });

  it("pedido mostra a pílula e é clicável (abre o detalhe)", () => {
    const pendente = ag({ status: "pendente" });
    banco.dados.agendamentos = [pendente];
    banco.dados.slots = [{ id: `${HOJE}_10:00`, data: HOJE, hora: "10:00", status: "pendente" }];
    render(<AgendaDia />);
    expect(screen.getByText("Pedido")).toBeTruthy();
    fireEvent.click(screen.getByText("Bruna").closest("button")!);
    expect(screen.getByTestId("folha-detalhe").getAttribute("data-id")).toBe(pendente.id);
  });

  it("bloqueado mostra o cadeado e o botão Liberar chama liberarHorarios", async () => {
    banco.liberarHorarios.mockResolvedValue({ liberados: [{ data: HOJE, hora: "16:00" }], ignorados: [] });
    banco.dados.slots = [{ id: `${HOJE}_16:00`, data: HOJE, hora: "16:00", status: "bloqueado" }];
    render(<AgendaDia />);
    expect(screen.getByText("Bloqueado")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Liberar" }));
    await waitFor(() => expect(banco.liberarHorarios).toHaveBeenCalledWith([{ data: HOJE, hora: "16:00" }]));
  });
});

describe("Horário passado", () => {
  it("livre no passado (hoje, antes de agora) some da lista", () => {
    // agora = 15:00; 09:00 e 10:00 já passaram, 14:00 também (antes das 15:00)
    render(<AgendaDia />);
    expect(screen.queryByText("09:00")).toBeNull();
  });

  it("cliente confirmada num horário já passado continua visível", () => {
    banco.dados.agendamentos = [ag({ hora: "09:00", id: `${HOJE}_09:00` })];
    banco.dados.slots = [{ id: `${HOJE}_09:00`, data: HOJE, hora: "09:00", status: "confirmado" }];
    render(<AgendaDia />);
    expect(screen.getByText("Bruna")).toBeTruthy();
    expect(screen.getByText("09:00").closest(".pn-linha")?.className).toContain("passou");
  });
});

describe("Folga", () => {
  it("dia em folga não mostra horários e avisa no resumo", () => {
    banco.dados.agenda = { dias: { "2": ["09:00"] }, bloqueios: [HOJE] };
    render(<AgendaDia />);
    expect(screen.getByText("Folga marcada")).toBeTruthy();
    expect(screen.getByText("Nenhum horário disponível — dia marcado como folga.")).toBeTruthy();
    expect(screen.queryByText("Livre")).toBeNull();
  });

  it("cliente já marcada no dia de folga continua aparecendo (a folga fecha só os livres)", () => {
    banco.dados.agenda = { dias: { "2": ["16:00", "17:00"] }, bloqueios: [HOJE] };
    banco.dados.agendamentos = [ag({ id: `${HOJE}_16:00`, hora: "16:00" })];
    banco.dados.slots = [{ id: `${HOJE}_16:00`, data: HOJE, hora: "16:00", status: "confirmado" }];
    render(<AgendaDia />);
    expect(screen.getByText("Bruna")).toBeTruthy();
    expect(screen.queryByText("Livre")).toBeNull();
    expect(screen.getByText("Folga marcada · 1 confirmado")).toBeTruthy();
    expect(screen.getByText(/Quem já estava marcada continua abaixo/)).toBeTruthy();
  });
});

describe("Dia sem horários", () => {
  it("horários da tabela que já passaram: avisa que passaram (não que a tabela está vazia)", () => {
    banco.dados.agenda = { dias: { "2": ["09:00", "10:00"] }, bloqueios: [] }; // agora = 15:00
    render(<AgendaDia />);
    expect(screen.getByText("Os horários deste dia já passaram.")).toBeTruthy();
  });

  it("dia sem nenhum horário na tabela", () => {
    banco.dados.agenda = { dias: {}, bloqueios: [] };
    render(<AgendaDia />);
    expect(screen.getByText("Sem horários na tabela deste dia.")).toBeTruthy();
  });
});

describe("Faixa da semana", () => {
  it("mostra os 7 dias e marca o dia atual como ativo", () => {
    render(<AgendaDia />);
    const ativo = screen.getByRole("button", { name: /hoje/ });
    expect(ativo.className).toContain("active");
  });

  it("tocar num dia da semana troca o dia exibido", () => {
    render(<AgendaDia />);
    // Quinta (09/05) é 2 dias depois de terça (07/05).
    fireEvent.click(screen.getByRole("button", { name: /^qui, 9/ }));
    // Só a primeira letra maiúscula ("de"/"maio" ficam minúsculos).
    expect(screen.getByRole("heading", { name: "Quinta, 9 de maio" })).toBeTruthy();
  });
});

describe("Banner de pedidos", () => {
  it("sem pedidos, não mostra o banner", () => {
    render(<AgendaDia />);
    expect(screen.queryByText(/esperando você/)).toBeNull();
  });

  it("com pedidos (de qualquer dia), mostra o banner e leva pra aba Pedidos", () => {
    banco.dados.agendamentos = [ag({ status: "pendente", data: "2030-05-09", id: "2030-05-09_10:00" })];
    const onIr = vi.fn();
    render(<AgendaDia onIrParaPedidos={onIr} />);
    fireEvent.click(screen.getByText("1 pedido esperando você"));
    expect(onIr).toHaveBeenCalledOnce();
  });
});

describe("Bloquear", () => {
  it("abre a folha já com o dia visível", () => {
    render(<AgendaDia />);
    fireEvent.click(screen.getByRole("button", { name: /Bloquear/ }));
    expect(screen.getByTestId("folha-bloquear").getAttribute("data-data-inicial")).toBe(HOJE);
  });
});

describe("Agendar num horário livre (B2)", () => {
  it("tocar em Livre abre FolhaAgendar já com o dia e a hora", () => {
    banco.dados.agenda = { dias: { "2": ["16:00"] }, bloqueios: [] };
    render(<AgendaDia />);
    fireEvent.click(screen.getByText("Livre").closest("button")!);
    const folha = screen.getByTestId("folha-agendar");
    expect(folha.getAttribute("data-data")).toBe(HOJE);
    expect(folha.getAttribute("data-hora")).toBe("16:00");
  });

  it("depois de criar, mostra o aviso com o nome e o link do WhatsApp", () => {
    banco.dados.agenda = { dias: { "2": ["16:00"] }, bloqueios: [] };
    render(<AgendaDia />);
    fireEvent.click(screen.getByText("Livre").closest("button")!);
    fireEvent.click(screen.getByText("criar fake"));
    expect(screen.getByText("Agendamento de Fulana adicionado!")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Enviar confirmação no WhatsApp" });
    expect(link.getAttribute("href")).toBe("https://wa.me/x");
  });
});

describe("Ver detalhe de um horário ocupado (B2)", () => {
  it("tocar num confirmado abre o detalhe com o id certo", () => {
    const a = ag();
    banco.dados.agendamentos = [a];
    banco.dados.slots = [{ id: `${HOJE}_10:00`, data: HOJE, hora: "10:00", status: "confirmado" }];
    render(<AgendaDia />);
    fireEvent.click(screen.getByText("Bruna").closest("[data-estado='confirmado']")!);
    expect(screen.getByTestId("folha-detalhe").getAttribute("data-id")).toBe(a.id);
  });

  it("tocar no ícone de WhatsApp não abre o detalhe (o link tem prioridade)", () => {
    banco.dados.agendamentos = [ag()];
    banco.dados.slots = [{ id: `${HOJE}_10:00`, data: HOJE, hora: "10:00", status: "confirmado" }];
    render(<AgendaDia />);
    fireEvent.click(screen.getByRole("link", { name: /WhatsApp/ }));
    expect(screen.queryByTestId("folha-detalhe")).toBeNull();
  });
});
