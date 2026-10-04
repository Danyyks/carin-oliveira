// @vitest-environment jsdom
// Testes da folha "Bloquear horários": a Carin escolhe um dia, marca horários e salva.
// O banco (Firestore) é trocado por um falso; o que importa é o que ela vê e o que é gravado.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { hojeKey, proximosDias } from "@/lib/utils";
import { datasRepetidas } from "@/lib/agendaDia";
import FolhaBloquear from "./FolhaBloquear";

type Alvo = { data: string; hora: string };

const banco = vi.hoisted(() => ({
  agenda: { dias: {}, bloqueios: [] } as { dias?: Record<string, string[]>; bloqueios?: string[] },
  ocupados: new Set<string>(),
  bloqueados: new Set<string>(),
  agendamentos: [] as { id: string; data: string; hora: string; clienteNome: string }[],
  janela: undefined as unknown,
  bloquearHorarios: vi.fn(),
  liberarHorarios: vi.fn(),
  bloquearDias: vi.fn(),
  liberarDias: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  ouvirAgenda: (cb: (a: unknown) => void) => {
    cb(banco.agenda);
    return () => {};
  },
  ouvirSlotsOcupados: (cb: (o: Set<string>, b: Set<string>) => void, janela: unknown) => {
    banco.janela = janela;
    cb(banco.ocupados, banco.bloqueados);
    return () => {};
  },
  ouvirAgendamentos: (cb: (l: unknown[]) => void) => {
    cb(banco.agendamentos);
    return () => {};
  },
  bloquearHorarios: banco.bloquearHorarios,
  liberarHorarios: banco.liberarHorarios,
  bloquearDias: banco.bloquearDias,
  liberarDias: banco.liberarDias,
}));

// Um dia bem à frente (fora dos 14 chips), escolhido pelo campo "Outra data".
const DIA = proximosDias(21)[19];
const GRADE = ["08:00", "09:30", "11:00", "13:00", "14:30", "19:00"]; // 3 de manhã, 2 à tarde, 1 à noite
const id = (hora: string, data = DIA.key) => `${data}_${hora}`;

let onFechar = vi.fn();
let onSalvo = vi.fn();

beforeEach(() => {
  banco.agenda = { dias: { [String(DIA.weekday)]: GRADE }, bloqueios: [] };
  banco.ocupados = new Set();
  banco.bloqueados = new Set();
  banco.agendamentos = [];
  banco.janela = undefined;
  banco.bloquearHorarios.mockReset();
  banco.bloquearHorarios.mockImplementation(async (alvos: Alvo[]) => ({ feitos: alvos, ignorados: [] }));
  banco.liberarHorarios.mockReset();
  banco.liberarHorarios.mockImplementation(async (alvos: Alvo[]) => ({ liberados: alvos, ignorados: [] }));
  banco.bloquearDias.mockReset();
  banco.bloquearDias.mockResolvedValue(undefined);
  banco.liberarDias.mockReset();
  banco.liberarDias.mockResolvedValue(undefined);
  onFechar = vi.fn();
  onSalvo = vi.fn();
});
afterEach(cleanup);

const abrir = () => render(<FolhaBloquear onFechar={onFechar} onSalvo={onSalvo} />);
const escolherDia = (key = DIA.key) => fireEvent.change(screen.getByLabelText("Outra data"), { target: { value: key } });
const botao = (nome: string | RegExp) => screen.getByRole("button", { name: nome }) as HTMLButtonElement;
const tocar = (nome: string | RegExp) => fireEvent.click(botao(nome));
const salvar = (nome: string | RegExp) => tocar(nome);
const desfazerDoAviso = () => onSalvo.mock.calls[0][1] as () => Promise<unknown>;

describe("Bloquear horários: escolher o dia", () => {
  it("lê os horários só de hoje em diante", () => {
    abrir();
    expect(banco.janela).toEqual({ desde: hojeKey() });
  });

  it("antes de escolher o dia, pede o dia e o botão fica apagado", () => {
    abrir();
    expect(screen.getByText("Escolha o dia para ver os horários.")).toBeTruthy();
    expect(botao("Bloquear horários").disabled).toBe(true);
  });

  it("mostra os próximos 14 dias começando por hoje, e marca as folgas com a palavra", () => {
    const amanha = proximosDias(1)[0];
    banco.agenda.bloqueios = [amanha.key];
    abrir();
    expect(document.querySelectorAll(".pn-dias .chip")).toHaveLength(14);
    expect(document.querySelector(".pn-dias .chip")!.getAttribute("aria-label")).toMatch(/^Hoje, /);
    expect(botao(`${amanha.label}, folga`).textContent).toContain("folga");
  });

  it("tocar num dia da fileira mostra os horários dele", () => {
    const dia = proximosDias(5)[3];
    banco.agenda.dias = { [String(dia.weekday)]: GRADE };
    abrir();
    tocar(dia.label);
    expect(botao("09:30")).toBeTruthy();
    expect(botao(dia.label).getAttribute("aria-pressed")).toBe("true");
  });

  it("mostra os horários da tabela dela no dia escolhido, com os atalhos", () => {
    abrir();
    escolherDia();
    for (const h of GRADE) expect(botao(h).disabled).toBe(false);
    for (const a of ["Manhã", "Tarde", "Noite", "Dia todo"]) expect(botao(a)).toBeTruthy();
  });

  it("só oferece atalho de período que tem horário", () => {
    banco.agenda.dias = { [String(DIA.weekday)]: ["09:00", "10:00"] };
    abrir();
    escolherDia();
    expect(screen.queryByRole("button", { name: "Tarde" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Noite" })).toBeNull();
    expect(botao("Manhã")).toBeTruthy();
  });

  it("uma data que já passou é tratada como sem data", () => {
    abrir();
    escolherDia("2020-01-01");
    expect(screen.getByText("Escolha o dia para ver os horários.")).toBeTruthy();
  });

  it("dia sem horários na tabela avisa, e o botão continua apagado", () => {
    banco.agenda.dias = {};
    abrir();
    escolherDia();
    expect(screen.getByText("Sem horários na sua tabela neste dia.")).toBeTruthy();
    expect(botao("Bloquear horários").disabled).toBe(true);
  });

  it("trocar de dia limpa o que estava marcado", () => {
    const outro = proximosDias(21)[18];
    banco.agenda.dias = { [String(DIA.weekday)]: GRADE, [String(outro.weekday)]: GRADE };
    abrir();
    escolherDia();
    tocar("Manhã");
    escolherDia(outro.key);
    expect(botao("08:00").getAttribute("aria-pressed")).toBe("false");
    expect(botao("Bloquear horários").disabled).toBe(true);
  });
});

describe("Bloquear horários: marcar", () => {
  it("Manhã só MARCA os horários da manhã e nada é gravado ainda", () => {
    abrir();
    escolherDia();
    tocar("Manhã");

    for (const h of ["08:00", "09:30", "11:00"]) expect(botao(h).getAttribute("aria-pressed")).toBe("true");
    for (const h of ["13:00", "14:30", "19:00"]) expect(botao(h).getAttribute("aria-pressed")).toBe("false");
    expect(botao("Bloquear 3 horários").disabled).toBe(false);
    expect(banco.bloquearHorarios).not.toHaveBeenCalled();
  });

  it("tocar de novo no atalho desmarca", () => {
    abrir();
    escolherDia();
    tocar("Manhã");
    tocar("Manhã");
    expect(botao("Bloquear horários").disabled).toBe(true);
  });

  it("dá para somar atalho e horários soltos, e o botão conta certo", () => {
    abrir();
    escolherDia();
    tocar("Tarde");
    tocar("19:00");
    expect(botao("Bloquear 3 horários")).toBeTruthy();
    tocar("13:00"); // desmarca um
    expect(botao("Bloquear 2 horários")).toBeTruthy();
  });

  it("horário com cliente fica apagado com o primeiro nome e o atalho não o marca", () => {
    banco.ocupados.add(id("09:30"));
    banco.agendamentos = [{ id: id("09:30"), data: DIA.key, hora: "09:30", clienteNome: "Bruna Lima" }];
    abrir();
    escolherDia();

    const ocupado = botao("09:30, ocupado por Bruna");
    expect(ocupado.disabled).toBe(true);
    expect(ocupado.textContent).not.toContain("Lima");
    tocar("Manhã");
    expect(botao("Bloquear 2 horários")).toBeTruthy(); // 08:00 e 11:00
    expect(ocupado.getAttribute("aria-pressed")).toBeNull();
  });
});

describe("Bloquear horários: salvar", () => {
  it("grava só os horários marcados, só desse dia, e avisa com Desfazer", async () => {
    abrir();
    escolherDia();
    tocar("Manhã");
    salvar("Bloquear 3 horários");

    await waitFor(() => expect(onFechar).toHaveBeenCalledTimes(1));
    expect(banco.bloquearHorarios).toHaveBeenCalledTimes(1);
    expect(banco.bloquearHorarios).toHaveBeenCalledWith([
      { data: DIA.key, hora: "08:00" },
      { data: DIA.key, hora: "09:30" },
      { data: DIA.key, hora: "11:00" },
    ]);
    expect(banco.liberarHorarios).not.toHaveBeenCalled();
    expect(banco.bloquearDias).not.toHaveBeenCalled(); // não é folga do dia
    expect(onSalvo).toHaveBeenCalledWith("3 horários bloqueados.", expect.any(Function));
  });

  it("Desfazer libera exatamente o que foi bloqueado", async () => {
    abrir();
    escolherDia();
    tocar("Manhã");
    salvar("Bloquear 3 horários");
    await waitFor(() => expect(onSalvo).toHaveBeenCalled());

    await desfazerDoAviso()();
    expect(banco.liberarHorarios).toHaveBeenCalledWith([
      { data: DIA.key, hora: "08:00" },
      { data: DIA.key, hora: "09:30" },
      { data: DIA.key, hora: "11:00" },
    ]);
  });

  it("no singular: '1 horário bloqueado.'", async () => {
    abrir();
    escolherDia();
    tocar("19:00");
    salvar("Bloquear 1 horário");
    await waitFor(() => expect(onSalvo).toHaveBeenCalledWith("1 horário bloqueado.", expect.any(Function)));
  });

  it("horário que uma cliente pegou no meio do caminho: avisa quantos ficaram de fora", async () => {
    banco.bloquearHorarios.mockImplementation(async (alvos: Alvo[]) => ({
      feitos: alvos.slice(0, 2),
      ignorados: [{ ...alvos[2], motivo: "ocupado" }],
    }));
    abrir();
    escolherDia();
    tocar("Manhã");
    salvar("Bloquear 3 horários");

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(onSalvo.mock.calls[0][0]).toBe("2 horários bloqueados. 1 já tinha cliente.");
    // o Desfazer só mexe no que foi de fato bloqueado
    await desfazerDoAviso()();
    expect(banco.liberarHorarios).toHaveBeenCalledWith([
      { data: DIA.key, hora: "08:00" },
      { data: DIA.key, hora: "09:30" },
    ]);
  });

  it("se nada pôde ser alterado, mantém a folha aberta e explica", async () => {
    banco.bloquearHorarios.mockImplementation(async (alvos: Alvo[]) => ({
      feitos: [],
      ignorados: alvos.map((a) => ({ ...a, motivo: "ocupado" })),
    }));
    abrir();
    escolherDia();
    tocar("19:00");
    salvar("Bloquear 1 horário");

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Nada mudou");
    expect(onFechar).not.toHaveBeenCalled();
    expect(onSalvo).not.toHaveBeenCalled();
  });

  it("enquanto salva, o botão mostra 'Salvando…' e não aceita outro toque", async () => {
    let terminar: (v: unknown) => void = () => {};
    banco.bloquearHorarios.mockImplementation(() => new Promise((ok) => (terminar = ok)));
    abrir();
    escolherDia();
    tocar("19:00");
    salvar("Bloquear 1 horário");

    const salvando = await screen.findByRole("button", { name: "Salvando…" });
    expect((salvando as HTMLButtonElement).disabled).toBe(true);
    terminar({ feitos: [{ data: DIA.key, hora: "19:00" }], ignorados: [] });
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
    expect(banco.bloquearHorarios).toHaveBeenCalledTimes(1);
  });
});

describe("Bloquear horários: liberar o que já estava bloqueado", () => {
  beforeEach(() => {
    for (const h of ["08:00", "09:30"]) {
      banco.ocupados.add(id(h));
      banco.bloqueados.add(id(h));
    }
  });

  it("horários já bloqueados aparecem marcados e o botão só acende quando ela muda algo", () => {
    abrir();
    escolherDia();
    expect(botao("08:00").getAttribute("aria-pressed")).toBe("true");
    expect(botao("09:30").getAttribute("aria-pressed")).toBe("true");
    expect(botao("11:00").getAttribute("aria-pressed")).toBe("false");
    expect(botao("Bloquear horários").disabled).toBe(true);
    expect(screen.getByText(/Horários com cadeado estão bloqueados/)).toBeTruthy();
  });

  it("desmarcar um vira 'Liberar 1 horário' e libera só esse", async () => {
    abrir();
    escolherDia();
    tocar("09:30");
    salvar("Liberar 1 horário");

    await waitFor(() => expect(onSalvo).toHaveBeenCalledWith("1 horário liberado.", expect.any(Function)));
    expect(banco.liberarHorarios).toHaveBeenCalledWith([{ data: DIA.key, hora: "09:30" }]);
    expect(banco.bloquearHorarios).not.toHaveBeenCalled();

    // Desfazer bloqueia de novo
    await desfazerDoAviso()();
    expect(banco.bloquearHorarios).toHaveBeenCalledWith([{ data: DIA.key, hora: "09:30" }]);
  });

  it("bloquear um novo e liberar outro ao mesmo tempo: 'Salvar alterações' faz as duas coisas", async () => {
    abrir();
    escolherDia();
    tocar("09:30"); // libera
    tocar("19:00"); // bloqueia
    salvar("Salvar alterações");

    await waitFor(() => expect(onSalvo).toHaveBeenCalledWith("Alterações salvas.", expect.any(Function)));
    expect(banco.bloquearHorarios).toHaveBeenCalledWith([{ data: DIA.key, hora: "19:00" }]);
    expect(banco.liberarHorarios).toHaveBeenCalledWith([{ data: DIA.key, hora: "09:30" }]);
  });
});

describe("Bloquear horários: dia inteiro (folga)", () => {
  it("Dia todo marca tudo e o botão vira 'Marcar folga'", () => {
    abrir();
    escolherDia();
    tocar("Dia todo");
    for (const h of GRADE) expect(botao(h).getAttribute("aria-pressed")).toBe("true");
    expect(botao("Marcar folga")).toBeTruthy();
  });

  it("salvar a folga grava a data em 'folgas' (não horário por horário) e o Desfazer reabre o dia", async () => {
    abrir();
    escolherDia();
    tocar("Dia todo");
    salvar("Marcar folga");

    await waitFor(() => expect(onFechar).toHaveBeenCalledTimes(1));
    expect(banco.bloquearDias).toHaveBeenCalledWith([DIA.key]);
    expect(banco.bloquearHorarios).not.toHaveBeenCalled();
    expect(onSalvo.mock.calls[0][0]).toMatch(/^Folga marcada em /);

    await desfazerDoAviso()();
    expect(banco.liberarDias).toHaveBeenCalledWith([DIA.key]);
  });

  it("marcar todos os horários um a um também é folga", () => {
    banco.agenda.dias = { [String(DIA.weekday)]: ["09:00", "10:00"] };
    abrir();
    escolherDia();
    tocar("09:00");
    expect(botao("Bloquear 1 horário")).toBeTruthy();
    tocar("10:00");
    expect(botao("Marcar folga")).toBeTruthy();
  });

  it("dia com cliente: avisa que a folga fecha só os horários livres e mantém a cliente", async () => {
    banco.ocupados.add(id("09:30"));
    banco.agendamentos = [{ id: id("09:30"), data: DIA.key, hora: "09:30", clienteNome: "Bruna" }];
    abrir();
    escolherDia();
    tocar("Dia todo");

    expect(screen.getByText(/Já tem 1 cliente marcada neste dia\. A folga fecha só os horários livres\./)).toBeTruthy();
    expect(botao("09:30, ocupado por Bruna").disabled).toBe(true); // continua ocupado
    salvar("Marcar folga");
    await waitFor(() => expect(banco.bloquearDias).toHaveBeenCalledWith([DIA.key]));
  });

  it("dia sem cliente não mostra esse aviso", () => {
    abrir();
    escolherDia();
    tocar("Dia todo");
    expect(screen.queryByText(/A folga fecha só os horários livres/)).toBeNull();
  });

  it("dia que já é folga: mostra o aviso e oferece 'Liberar o dia'", async () => {
    banco.agenda.bloqueios = [DIA.key];
    abrir();
    escolherDia();

    expect(screen.getByText(/Este dia está em folga/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Manhã" })).toBeNull(); // nada de horários para marcar
    salvar("Liberar o dia");

    await waitFor(() => expect(banco.liberarDias).toHaveBeenCalledWith([DIA.key]));
    expect(onSalvo).toHaveBeenCalledWith("Folga desfeita.", expect.any(Function));
    await desfazerDoAviso()();
    expect(banco.bloquearDias).toHaveBeenCalledWith([DIA.key]);
  });

  it("a opção de repetir só aparece quando é folga do dia inteiro", () => {
    abrir();
    escolherDia();
    expect(screen.queryByText(/Repetir nas próximas/)).toBeNull();
    tocar("Manhã");
    expect(screen.queryByText(/Repetir nas próximas/)).toBeNull();
    tocar("Manhã"); // desmarca
    tocar("Dia todo");
    expect(screen.getByText(/Repetir nas próximas 12/)).toBeTruthy();
  });

  it("marcando 'repetir', o botão muda e salvar bloqueia as 12 datas da mesma semana", async () => {
    abrir();
    escolherDia();
    tocar("Dia todo");
    fireEvent.click(screen.getByRole("checkbox", { name: /Repetir nas próximas 12/ }));

    const esperadas = datasRepetidas(DIA.key, 12);
    expect(botao(/^Marcar 12 /)).toBeTruthy();
    salvar(/^Marcar 12 /);

    await waitFor(() => expect(onFechar).toHaveBeenCalledTimes(1));
    expect(banco.bloquearDias).toHaveBeenCalledWith(esperadas);
    expect(onSalvo.mock.calls[0][0]).toContain("12");
    expect(onSalvo.mock.calls[0][0]).toContain("bloqueados");

    await desfazerDoAviso()();
    expect(banco.liberarDias).toHaveBeenCalledWith(esperadas);
  });

  it("sem marcar 'repetir', continua bloqueando só o dia escolhido (comportamento de sempre)", async () => {
    abrir();
    escolherDia();
    tocar("Dia todo");
    salvar("Marcar folga");
    await waitFor(() => expect(banco.bloquearDias).toHaveBeenCalledWith([DIA.key]));
  });

  it("trocar de dia desmarca o 'repetir'", () => {
    const outro = proximosDias(21)[18];
    banco.agenda.dias = { [String(DIA.weekday)]: GRADE, [String(outro.weekday)]: GRADE };
    abrir();
    escolherDia();
    tocar("Dia todo");
    fireEvent.click(screen.getByRole("checkbox", { name: /Repetir nas próximas 12/ }));
    escolherDia(outro.key);
    tocar("Dia todo");
    const checkbox = screen.getByRole("checkbox", { name: /Repetir nas próximas 12/ }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("todos os horários já bloqueados e nada mudado: não oferece 'Marcar folga' à toa", () => {
    for (const h of GRADE) {
      banco.ocupados.add(id(h));
      banco.bloqueados.add(id(h));
    }
    abrir();
    escolherDia();
    expect(botao("Bloquear horários").disabled).toBe(true);
  });
});

describe("Bloquear horários: quando dá erro", () => {
  async function tentar(erro: unknown) {
    banco.bloquearHorarios.mockRejectedValue(erro);
    abrir();
    escolherDia();
    tocar("19:00");
    salvar("Bloquear 1 horário");
    return screen.findByRole("alert");
  }

  it("sem conexão: fala em português e mantém o que ela marcou", async () => {
    const alerta = await tentar({ code: "unavailable" });
    expect(alerta.textContent).toBe("Sem conexão. Confira a internet e tente de novo.");
    expect(onFechar).not.toHaveBeenCalled();
    expect(onSalvo).not.toHaveBeenCalled();
    expect(botao("19:00").getAttribute("aria-pressed")).toBe("true");
    expect(botao("Bloquear 1 horário").disabled).toBe(false); // pode tentar de novo
  });

  it("sem permissão", async () => {
    const alerta = await tentar({ code: "permission-denied" });
    expect(alerta.textContent).toBe("Sem permissão para salvar. Saia do painel e entre de novo.");
  });

  it("cota do dia", async () => {
    const alerta = await tentar({ code: "resource-exhausted" });
    expect(alerta.textContent).toBe("O limite de uso de hoje foi atingido. Tente de novo amanhã.");
  });

  it("erro qualquer: mensagem simples, sem código técnico", async () => {
    const alerta = await tentar(new Error("boom"));
    expect(alerta.textContent).toBe("Não consegui salvar. Tente de novo.");
  });

  it("a mensagem some assim que ela mexe de novo", async () => {
    await tentar({ code: "unavailable" });
    tocar("13:00");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("falha na folga do dia também é tratada", async () => {
    banco.bloquearDias.mockRejectedValue({ code: "unavailable" });
    abrir();
    escolherDia();
    tocar("Dia todo");
    salvar("Marcar folga");
    expect((await screen.findByRole("alert")).textContent).toContain("Sem conexão");
    expect(onFechar).not.toHaveBeenCalled();
  });
});

describe("dataInicial (aberta a partir da Agenda por dia, já num dia escolhido)", () => {
  it("abre direto nos horários daquele dia, sem precisar escolher", () => {
    render(<FolhaBloquear onFechar={onFechar} onSalvo={onSalvo} dataInicial={DIA.key} />);
    expect(screen.getByRole("button", { name: "08:00" })).toBeTruthy();
    expect(screen.queryByText("Escolha o dia para ver os horários.")).toBeNull();
  });

  it("sem dataInicial, continua pedindo o dia (comportamento de sempre)", () => {
    abrir();
    expect(screen.getByText("Escolha o dia para ver os horários.")).toBeTruthy();
  });
});
