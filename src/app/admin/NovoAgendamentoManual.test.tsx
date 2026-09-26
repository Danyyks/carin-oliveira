// @vitest-environment jsdom
// Testes da tela "+ Adicionar agendamento" (agendamento manual da Carin).
// Simulam a dona usando o formulário; o banco (Firestore) é trocado por um falso.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { studio } from "@/config/studio";
import { labelData, proximosDias } from "@/lib/utils";
import NovoAgendamentoManual from "./NovoAgendamentoManual";

// Banco falso: o componente lê tudo pelas funções ouvirXxx (tempo real) do db.
const banco = vi.hoisted(() => ({
  criar: vi.fn(),
  servicos: [
    { id: "s1", nome: "Alongamento", desc: "", preco: 120, destaque: false },
    { id: "s2", nome: "Nail art", desc: "", preco: 45, destaque: false },
  ],
  ocupados: new Set<string>(),
  agenda: { dias: {} } as { dias?: Record<string, string[]>; bloqueios?: string[] },
  agendamentos: [] as { data: string; hora: string; clienteNome: string }[],
}));

vi.mock("@/lib/db", () => ({
  ouvirServicos: (cb: (lista: unknown[]) => void) => {
    cb(banco.servicos);
    return () => {};
  },
  ouvirSlotsOcupados: (cb: (ocupados: Set<string>) => void) => {
    cb(banco.ocupados);
    return () => {};
  },
  ouvirAgenda: (cb: (agenda: unknown) => void) => {
    cb(banco.agenda);
    return () => {};
  },
  ouvirAgendamentos: (cb: (lista: unknown[]) => void) => {
    cb(banco.agendamentos);
    return () => {};
  },
  criarAgendamentoManual: banco.criar,
}));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

// Datas futuras quaisquer (21 e 20 dias à frente): o teste não "vence" com o passar do tempo.
const [DIA_OUTRO, DIA] = [proximosDias(21)[19], proximosDias(21)[20]];
const GRADE = ["09:00", "10:00", "14:00", "15:00"];

beforeEach(() => {
  banco.criar.mockReset();
  banco.criar.mockImplementation(async (a: { data: string; hora: string }) => `${a.data}_${a.hora}`);
  banco.ocupados.clear();
  banco.agendamentos = [];
  // a tabela da Carin: nesse dia da semana ela atende nesses horários
  banco.agenda = { dias: { [String(DIA.weekday)]: GRADE }, bloqueios: [] };
});
afterEach(cleanup);

const abrir = () => fireEvent.click(screen.getByRole("button", { name: "+ Adicionar agendamento" }));
const escolherData = (key = DIA.key) => fireEvent.change(screen.getByLabelText("Data"), { target: { value: key } });
const chip = (nome: string) => screen.getByRole("button", { name: nome }) as HTMLButtonElement;

/** A dona abre o formulário e preenche tudo. `outro` = digita a hora em vez de tocar num botão. */
function preencher({ whatsapp = "(15) 99999-8888", hora = "14:00", outro = false } = {}) {
  abrir();
  fireEvent.change(screen.getByLabelText("Nome da cliente"), { target: { value: "Ana Souza" } });
  fireEvent.change(screen.getByLabelText("WhatsApp (opcional)"), { target: { value: whatsapp } });
  fireEvent.click(screen.getByRole("button", { name: /Alongamento/ }));
  escolherData();
  if (outro) {
    fireEvent.click(chip("Outro horário"));
    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: hora } });
  } else {
    fireEvent.click(chip(hora));
  }
}
const salvar = () => fireEvent.click(screen.getByRole("button", { name: "Salvar agendamento" }));

describe("Agendamento manual: confirmação para a cliente", () => {
  it("depois de salvar, oferece o WhatsApp com a confirmação já escrita", async () => {
    render(<NovoAgendamentoManual />);
    preencher();
    salvar();

    const link = await screen.findByRole("link", { name: "Enviar confirmação no WhatsApp" });

    // gravou o agendamento certo
    expect(banco.criar).toHaveBeenCalledTimes(1);
    expect(banco.criar).toHaveBeenCalledWith({
      servicos: [{ nome: "Alongamento", preco: 120 }],
      total: 120,
      clienteNome: "Ana Souza",
      clienteWhatsapp: "(15) 99999-8888",
      data: DIA.key,
      hora: "14:00",
      diaLabel: labelData(DIA.key),
    });

    // o botão leva ao WhatsApp DA CLIENTE com a mensagem de confirmação pronta
    const href = link.getAttribute("href")!;
    expect(href.startsWith("https://wa.me/5515999998888?text=")).toBe(true);
    const msg = decodeURIComponent(href.split("?text=")[1]);
    expect(msg).toContain("Olá, Ana! Seu horário está *confirmado*.");
    expect(msg).toContain("• Alongamento — R$ 120");
    expect(msg).toContain(`*Quando:* ${labelData(DIA.key)} às 14:00`);
    expect(msg).toContain(studio.enderecoTexto);
    expect(link.getAttribute("target")).toBe("_blank");

    expect(screen.getByText("Agendamento de Ana adicionado!")).toBeTruthy();
  });

  it("vale também para um horário digitado em 'Outro horário' (fora da tabela)", async () => {
    render(<NovoAgendamentoManual />);
    preencher({ outro: true, hora: "19:30" });
    salvar();

    const link = await screen.findByRole("link", { name: "Enviar confirmação no WhatsApp" });
    expect(banco.criar).toHaveBeenCalledWith(expect.objectContaining({ hora: "19:30", data: DIA.key }));
    expect(decodeURIComponent(link.getAttribute("href")!)).toContain("às 19:30");
  });

  it("sem WhatsApp, salva e avisa que a cliente não recebe a confirmação", async () => {
    render(<NovoAgendamentoManual />);
    preencher({ whatsapp: "" });
    salvar();

    expect(await screen.findByText("Sem WhatsApp cadastrado, a cliente não recebe a confirmação.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Enviar confirmação/ })).toBeNull();
    expect(banco.criar).toHaveBeenCalledTimes(1);
  });

  it("se não conseguir gravar, mostra o erro e NÃO oferece a confirmação", async () => {
    banco.criar.mockRejectedValueOnce({ code: "permission-denied" });
    render(<NovoAgendamentoManual />);
    preencher();
    salvar();

    expect(await screen.findByText(/Não consegui salvar \(permission-denied/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Enviar confirmação/ })).toBeNull();
    // o formulário continua aberto, com o que ela digitou
    expect((screen.getByLabelText("Nome da cliente") as HTMLInputElement).value).toBe("Ana Souza");
  });

  it("não salva com WhatsApp incompleto", async () => {
    render(<NovoAgendamentoManual />);
    preencher({ whatsapp: "1599" });
    salvar();

    expect(await screen.findByText("WhatsApp incompleto (ou deixe em branco).")).toBeTruthy();
    expect(banco.criar).not.toHaveBeenCalled();
  });

  it("a data mínima do formulário é o dia de hoje no fuso local, mesmo à noite", () => {
    // 22h30 em São Paulo já é "amanhã" em UTC: o formulário não pode travar o dia de hoje.
    const tzAntes = process.env.TZ;
    process.env.TZ = "America/Sao_Paulo";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-05-08T01:30:00Z"));
    try {
      render(<NovoAgendamentoManual />);
      abrir();
      expect(screen.getByLabelText("Data").getAttribute("min")).toBe("2030-05-07");
    } finally {
      vi.useRealTimers();
      if (tzAntes === undefined) delete process.env.TZ;
      else process.env.TZ = tzAntes;
    }
  });
});

describe("Agendamento manual: horários do dia", () => {
  beforeEach(() => {
    // Bruna já está às 10:00 desse dia (o horário aparece travado na agenda pública também)
    banco.ocupados.add(`${DIA.key}_10:00`);
    banco.agendamentos = [{ data: DIA.key, hora: "10:00", clienteNome: "Bruna Lima" }];
  });

  it("mostra os horários da tabela do dia escolhido como botões", () => {
    render(<NovoAgendamentoManual />);
    abrir();
    expect(screen.queryByRole("group", { name: "Horários do dia" })).toBeNull(); // antes de escolher a data
    escolherData();

    for (const h of ["09:00", "14:00", "15:00"]) expect(chip(h).disabled).toBe(false);
    expect(chip("Outro horário")).toBeTruthy();
  });

  it("o horário ocupado fica apagado, sem clique, e mostra o nome da cliente", () => {
    render(<NovoAgendamentoManual />);
    abrir();
    escolherData();

    const ocupado = chip("10:00, ocupado por Bruna");
    expect(ocupado.disabled).toBe(true);
    expect(ocupado.className).toContain("taken");
    expect(ocupado.textContent).toContain("Bruna");
    expect(ocupado.textContent).not.toContain("Lima"); // só o primeiro nome
    // os livres não ficam apagados
    expect(chip("09:00").className).not.toContain("taken");
  });

  it("tocar num horário livre o seleciona; tocar em outro troca a seleção", () => {
    render(<NovoAgendamentoManual />);
    abrir();
    escolherData();

    fireEvent.click(chip("09:00"));
    expect(chip("09:00").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(chip("15:00"));
    expect(chip("15:00").getAttribute("aria-pressed")).toBe("true");
    expect(chip("09:00").getAttribute("aria-pressed")).toBe("false");
  });

  it("horário ocupado fora da tabela (exceção aberta antes) também aparece apagado", () => {
    banco.ocupados.add(`${DIA.key}_19:30`);
    banco.agendamentos.push({ data: DIA.key, hora: "19:30", clienteNome: "Carla" });
    render(<NovoAgendamentoManual />);
    abrir();
    escolherData();

    expect(chip("19:30, ocupado por Carla").disabled).toBe(true);
  });

  it("'Outro horário' deixa digitar uma hora fora da tabela", () => {
    render(<NovoAgendamentoManual />);
    abrir();
    escolherData();
    expect(screen.queryByLabelText("Hora")).toBeNull();

    fireEvent.click(chip("Outro horário"));
    expect(screen.getByLabelText("Hora")).toBeTruthy();
    expect(chip("Outro horário").getAttribute("aria-pressed")).toBe("true");
  });

  it("ao digitar um horário que já tem cliente, avisa na hora quem é e não salva", async () => {
    render(<NovoAgendamentoManual />);
    preencher({ outro: true, hora: "10:00" });

    expect(screen.getByText("Já tem Bruna às 10:00.")).toBeTruthy();
    salvar();
    expect(await screen.findByText("Já existe um agendamento nesse horário.")).toBeTruthy();
    expect(banco.criar).not.toHaveBeenCalled();
  });

  it("trocar a data limpa o horário escolhido", async () => {
    render(<NovoAgendamentoManual />);
    preencher(); // escolhe 14:00 em DIA
    escolherData(DIA_OUTRO.key); // muda de dia
    salvar();

    expect(await screen.findByText("Escolha o horário.")).toBeTruthy();
    expect(banco.criar).not.toHaveBeenCalled();
  });

  it("dia de folga: avisa, mas ela ainda pode registrar a cliente", async () => {
    banco.agenda = { dias: { [String(DIA.weekday)]: GRADE }, bloqueios: [DIA.key] };
    render(<NovoAgendamentoManual />);
    preencher();

    expect(screen.getByText("Folga marcada neste dia.")).toBeTruthy();
    salvar();
    await screen.findByRole("link", { name: "Enviar confirmação no WhatsApp" });
    expect(banco.criar).toHaveBeenCalledTimes(1);
  });

  it("dia sem horários na tabela: explica e oferece 'Outro horário'", () => {
    banco.ocupados.clear();
    banco.agendamentos = [];
    banco.agenda = { dias: {}, bloqueios: [] };
    render(<NovoAgendamentoManual />);
    abrir();
    escolherData();

    expect(screen.getByText("Sem horários na sua tabela neste dia. Use o botão Outro horário.")).toBeTruthy();
    expect(chip("Outro horário")).toBeTruthy();
  });

  it("não quebra se a agenda ainda só tem folgas salvas (sem 'dias')", () => {
    banco.ocupados.clear();
    banco.agendamentos = [];
    banco.agenda = { bloqueios: ["2031-01-01"] };
    render(<NovoAgendamentoManual />);
    abrir();
    escolherData();

    expect(chip("Outro horário")).toBeTruthy();
  });
});
