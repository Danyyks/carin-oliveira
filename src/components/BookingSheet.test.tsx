// @vitest-environment jsdom
// Testes do sheet de agendamento do SITE (a cliente escolhe serviço, dia e horário).
// O banco (Firestore) é trocado por um falso; o foco é o que a cliente vê e o que o
// componente lê do banco (só quando abre, só a janela de datas que o site oferece).
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { studio } from "@/config/studio";
import { proximosDias, type Dia } from "@/lib/utils";
import BookingSheet from "./BookingSheet";

type AgendaFalsa = { dias?: Record<string, string[]>; bloqueios?: string[] };

const banco = vi.hoisted(() => ({
  ocupados: new Set<string>(),
  agenda: { dias: {} } as { dias?: Record<string, string[]>; bloqueios?: string[] },
  entregar: true, // false = o banco "demora": nada chega
  ouvirAgenda: vi.fn(),
  ouvirSlotsOcupados: vi.fn(),
  criar: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  ouvirAgenda: banco.ouvirAgenda,
  ouvirSlotsOcupados: banco.ouvirSlotsOcupados,
  criarAgendamento: banco.criar,
}));

const SERVICOS = [
  { nome: "Alongamento", desc: "", preco: 120 },
  { nome: "Nail art", desc: "", preco: 45 },
];
const DIAS = proximosDias(14);
const DIA = DIAS[5];
const GRADE = ["09:00", "10:00"];

const montar = (open = true, onClose = vi.fn()) => (
  <BookingSheet studio={studio} servicos={SERVICOS} open={open} preset={null} onClose={onClose} />
);

/** Botão do dia (o texto do chip junta dia da semana, número e mês). */
const chipDia = (d: Dia) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>(".day-chip")).find(
    (b) => b.textContent === `${d.dia}${d.num}${d.mes}`,
  );
const horaBtn = (h: string) => screen.queryByRole("button", { name: h }) as HTMLButtonElement | null;

beforeEach(() => {
  banco.ocupados = new Set();
  banco.agenda = { dias: { [String(DIA.weekday)]: GRADE }, bloqueios: [] };
  banco.entregar = true;
  banco.ouvirAgenda.mockReset();
  banco.ouvirAgenda.mockImplementation((cb: (a: AgendaFalsa) => void) => {
    if (banco.entregar) cb(banco.agenda);
    return () => {};
  });
  banco.ouvirSlotsOcupados.mockReset();
  banco.ouvirSlotsOcupados.mockImplementation((cb: (o: Set<string>) => void) => {
    if (banco.entregar) cb(banco.ocupados);
    return () => {};
  });
  banco.criar.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({}));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Sheet do site: o que lê do banco", () => {
  it("quem só olha a página (sheet fechado) não gasta nenhuma leitura", () => {
    render(montar(false));
    expect(banco.ouvirAgenda).not.toHaveBeenCalled();
    expect(banco.ouvirSlotsOcupados).not.toHaveBeenCalled();
  });

  it("começa a ler quando a cliente abre o sheet", () => {
    const { rerender } = render(montar(false));
    rerender(montar(true));
    expect(banco.ouvirAgenda).toHaveBeenCalledTimes(1);
    expect(banco.ouvirSlotsOcupados).toHaveBeenCalledTimes(1);
  });

  it("lê só a janela que o site oferece: de amanhã até daqui a 14 dias", () => {
    render(montar(true));
    expect(banco.ouvirSlotsOcupados).toHaveBeenCalledWith(expect.any(Function), {
      desde: DIAS[0].key,
      ate: DIAS[13].key,
    });
  });

  it("fechar e reabrir não cria uma segunda leitura", () => {
    const { rerender } = render(montar(true));
    rerender(montar(false));
    rerender(montar(true));
    expect(banco.ouvirAgenda).toHaveBeenCalledTimes(1);
    expect(banco.ouvirSlotsOcupados).toHaveBeenCalledTimes(1);
  });
});

describe("Sheet do site: dias e horários oferecidos", () => {
  it("oferece os horários da tabela da Carin no dia certo da semana", () => {
    render(montar());
    fireEvent.click(chipDia(DIA)!);
    expect(horaBtn("09:00")).toBeTruthy();
    expect(horaBtn("10:00")).toBeTruthy();
  });

  it("horário ocupado ou bloqueado pela Carin não aparece para a cliente", () => {
    banco.ocupados = new Set([`${DIA.key}_09:00`]);
    render(montar());
    fireEvent.click(chipDia(DIA)!);
    expect(horaBtn("09:00")).toBeNull();
    expect(horaBtn("10:00")).toBeTruthy();
  });

  it("bloquear a manhã de um dia não mexe nos outros dias da mesma semana", () => {
    // Bloqueio só na data DIA; a outra data com o mesmo dia da semana continua com os dois horários.
    const outra = DIAS[12];
    expect(outra.weekday).toBe(DIA.weekday);
    banco.ocupados = new Set([`${DIA.key}_09:00`, `${DIA.key}_10:00`]);
    render(montar());
    expect(chipDia(DIA)).toBeUndefined(); // sem nenhum livre, o dia some
    fireEvent.click(chipDia(outra)!);
    expect(horaBtn("09:00")).toBeTruthy();
    expect(horaBtn("10:00")).toBeTruthy();
  });

  it("dia de folga não aparece", () => {
    banco.agenda = { dias: { [String(DIA.weekday)]: GRADE }, bloqueios: [DIA.key] };
    render(montar());
    expect(chipDia(DIA)).toBeUndefined();
    expect(chipDia(DIAS[12])).toBeTruthy(); // a outra data do mesmo dia da semana segue aberta
  });

  it("agenda sem `dias` (a Carin só salvou folgas) não derruba o site", () => {
    banco.agenda = { bloqueios: [DIAS[0].key] } as AgendaFalsa;
    expect(() => render(montar())).not.toThrow();
    // sem tabela configurada, vale o horário padrão do config
    expect(document.querySelectorAll(".day-chip").length).toBeGreaterThan(0);
    expect(chipDia(DIAS[0])).toBeUndefined();
  });

  it("enquanto o banco não responde, mostra 'Carregando horários…' e NÃO oferece horário nenhum", () => {
    vi.useFakeTimers();
    banco.entregar = false;
    render(montar());
    expect(screen.getByText("Carregando horários…")).toBeTruthy();
    expect(document.querySelectorAll(".day-chip")).toHaveLength(0); // nada de horário padrão inventado
  });

  it("se o banco não responde em 8 segundos, avisa que não há horários (e continua sem oferecer nenhum)", () => {
    vi.useFakeTimers();
    banco.entregar = false;
    render(montar());
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.queryByText("Carregando horários…")).toBeNull();
    expect(screen.getByText("Sem horários disponíveis no momento.")).toBeTruthy();
    expect(document.querySelectorAll(".day-chip")).toHaveLength(0);
  });

  it("só oferece dias quando a agenda E os horários ocupados chegaram", () => {
    // A agenda chega, mas os horários ocupados não: ainda não dá para saber o que está livre.
    banco.ouvirSlotsOcupados.mockImplementation(() => () => {});
    render(montar());
    expect(document.querySelectorAll(".day-chip")).toHaveLength(0);
    expect(screen.getByText("Carregando horários…")).toBeTruthy();
  });
});

describe("Sheet do site: duração do serviço", () => {
  const SERVICOS_LONGOS = [
    { nome: "Alongamento", desc: "", preco: 120, duracaoMin: 90 },
    { nome: "Nail art", desc: "", preco: 45 },
  ];
  const GRADE_LONGA = ["09:00", "10:00", "11:00"];

  const montarLongo = () => (
    <BookingSheet studio={studio} servicos={SERVICOS_LONGOS} open={true} preset={null} onClose={vi.fn()} />
  );

  it("esconde o horário que a duração do serviço invadiria, se ele já está ocupado", () => {
    banco.agenda = { dias: { [String(DIA.weekday)]: GRADE_LONGA }, bloqueios: [] };
    banco.ocupados = new Set([`${DIA.key}_10:00`]); // alguém já pegou as 10:00
    render(montarLongo());
    fireEvent.click(screen.getByRole("button", { name: /Alongamento/ })); // 90min
    fireEvent.click(chipDia(DIA)!);

    // 09:00 + 90min = 10:30, invade as 10:00 (já ocupada): some da lista
    expect(horaBtn("09:00")).toBeNull();
    // 11:00 + 90min não esbarra em nada depois: continua oferecido
    expect(horaBtn("11:00")).toBeTruthy();
  });

  it("sem selecionar nenhum serviço, nada é filtrado por duração", () => {
    banco.agenda = { dias: { [String(DIA.weekday)]: GRADE_LONGA }, bloqueios: [] };
    banco.ocupados = new Set([`${DIA.key}_10:00`]);
    render(montarLongo());
    fireEvent.click(chipDia(DIA)!);
    expect(horaBtn("09:00")).toBeTruthy(); // livre normalmente, sem serviço escolhido ainda
    expect(horaBtn("11:00")).toBeTruthy();
  });

  it("se a duração não cabe em nenhum horário livre do dia, avisa e não trava a tela", () => {
    banco.agenda = { dias: { [String(DIA.weekday)]: ["09:00", "10:00"] }, bloqueios: [] };
    banco.ocupados = new Set([`${DIA.key}_10:00`]); // só sobra 09:00, mas o serviço come as 10:00
    render(montarLongo());
    fireEvent.click(screen.getByRole("button", { name: /Alongamento/ }));
    fireEvent.click(chipDia(DIA)!);

    expect(screen.getByText("Esse serviço não cabe em nenhum horário livre neste dia. Escolha outro dia.")).toBeTruthy();
    expect(document.querySelector(".chips")).toBeTruthy(); // a tela continua normal, sem quebrar
  });

  it("escolher um serviço mais longo DEPOIS de marcar a hora limpa a seleção se ela deixou de caber", () => {
    banco.agenda = { dias: { [String(DIA.weekday)]: GRADE_LONGA }, bloqueios: [] };
    banco.ocupados = new Set([`${DIA.key}_10:00`]);
    render(montarLongo());
    fireEvent.click(chipDia(DIA)!);
    fireEvent.click(horaBtn("09:00")!); // cabe, sem serviço nenhum ainda
    expect(horaBtn("09:00")!.className).toContain("active");

    fireEvent.click(screen.getByRole("button", { name: /Alongamento/ })); // agora invade as 10:00
    expect(horaBtn("09:00")).toBeNull();
  });

  it("o pedido de um serviço longo já fecha o horário seguinte junto (outra cliente não marca em cima)", async () => {
    banco.agenda = { dias: { [String(DIA.weekday)]: GRADE_LONGA }, bloqueios: [] };
    banco.criar.mockResolvedValue(`${DIA.key}_09:00`);
    render(montarLongo());
    fireEvent.click(screen.getByRole("button", { name: /Alongamento/ }));
    fireEvent.click(chipDia(DIA)!);
    fireEvent.click(horaBtn("09:00")!);
    fireEvent.change(screen.getByPlaceholderText("ex.: Maria Silva"), { target: { value: "Ana Souza" } });
    fireEvent.change(screen.getByPlaceholderText("ex.: 11 99999-8888"), { target: { value: "(15) 99999-8888" } });
    fireEvent.click(screen.getByRole("button", { name: "Finalizar pedido" }));

    await screen.findByText("Pedido enviado!");
    // 09:00 + 90min = 10:30: come as 10:00 (mas não as 11:00)
    expect(banco.criar.mock.calls[0][1]).toEqual(["10:00"]);
  });
});

describe("Sheet do site: enviar o pedido", () => {
  function preencher() {
    fireEvent.click(screen.getByRole("button", { name: /Alongamento/ }));
    fireEvent.click(chipDia(DIA)!);
    fireEvent.click(horaBtn("10:00")!);
    fireEvent.change(screen.getByPlaceholderText("ex.: Maria Silva"), { target: { value: "Ana Souza" } });
    fireEvent.change(screen.getByPlaceholderText("ex.: 11 99999-8888"), { target: { value: "(15) 99999-8888" } });
  }
  const finalizar = () => fireEvent.click(screen.getByRole("button", { name: "Finalizar pedido" }));

  it("pedido criado: mostra o sucesso e avisa a Carin pelo id do agendamento", async () => {
    banco.criar.mockResolvedValue(`${DIA.key}_10:00`);
    render(montar());
    preencher();
    finalizar();

    expect(await screen.findByText("Pedido enviado!")).toBeTruthy();
    expect(banco.criar).toHaveBeenCalledWith(
      expect.objectContaining({ data: DIA.key, hora: "10:00", clienteNome: "Ana Souza", total: 120 }),
      [], // serviço sem duração cadastrada: não bloqueia nenhum horário seguinte
    );
    const chamada = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(chamada[0]).toBe("/api/notify-owner");
    expect(JSON.parse(chamada[1].body)).toEqual({ agendamentoId: `${DIA.key}_10:00` });
  });

  it("horário tomado por outra pessoa (permission-denied): avisa e desmarca o horário", async () => {
    banco.criar.mockRejectedValue({ code: "permission-denied" });
    render(montar());
    preencher();
    finalizar();

    expect(await screen.findByText("Esse horário acabou de ser reservado. Escolha outro, por favor.")).toBeTruthy();
    expect(horaBtn("10:00")!.className).not.toContain("active");
    expect((screen.getByRole("button", { name: "Finalizar pedido" }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetch).not.toHaveBeenCalled(); // pedido não existe: ninguém é avisado
  });

  it("cota do Firestore estourada (resource-exhausted): mensagem própria, horário mantido", async () => {
    banco.criar.mockRejectedValue({ code: "resource-exhausted" });
    render(montar());
    preencher();
    finalizar();

    expect(await screen.findByText("Muitas pessoas agendando agora. Tente de novo em alguns minutos.")).toBeTruthy();
    expect(horaBtn("10:00")!.className).toContain("active");
  });

  it("falha de conexão: pede para conferir a internet, sem dizer que o horário acabou", async () => {
    banco.criar.mockRejectedValue(new Error("network"));
    render(montar());
    preencher();
    finalizar();

    expect(await screen.findByText("Não consegui enviar o pedido. Confira sua conexão e tente de novo.")).toBeTruthy();
    expect(screen.queryByText(/acabou de ser reservado/)).toBeNull();
    expect(horaBtn("10:00")!.className).toContain("active");
  });
});
