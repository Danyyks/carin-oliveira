// Testes da camada de dados: agenda normalizada, leitura por janela de datas e o bloqueio
// de horários. O Firestore é trocado por uma versão falsa em memória que cumpre a regra
// real das transações (toda leitura ANTES das escritas) e só grava se a transação termina.
import { beforeEach, describe, expect, it, vi } from "vitest";

type Ref = { path: string; col: string; id: string };
type Doc = Record<string, unknown>;
type Operacao = { __op: "union" | "remove"; items: string[] };

const banco = vi.hoisted(() => ({
  store: new Map<string, Record<string, unknown>>(),
  transacoes: 0,
  ultimoSnapshot: null as null | { ok: (snap: unknown) => void },
  filtros: [] as { campo: string; op: string; valor: string }[],
  autoId: 0,
}));

vi.mock("./firebase", () => ({ db: { fake: true } }));
vi.mock("firebase/firestore", () => {
  const ref = (col: string, id: string) => ({ path: `${col}/${id}`, col, id });
  class Tx {
    private escritas: (() => void)[] = [];
    private escreveu = false;
    async get(r: Ref) {
      if (this.escreveu) throw new Error("Firestore exige todas as leituras antes das escritas");
      return {
        exists: () => banco.store.has(r.path),
        data: () => banco.store.get(r.path),
      };
    }
    set(r: Ref, data: Doc) {
      this.escreveu = true;
      this.escritas.push(() => banco.store.set(r.path, { ...data }));
    }
    delete(r: Ref) {
      this.escreveu = true;
      this.escritas.push(() => banco.store.delete(r.path));
    }
    aplicar() {
      this.escritas.forEach((f) => f());
    }
  }
  const ehOperacao = (v: unknown): v is Operacao => !!v && typeof v === "object" && "__op" in v;
  const ehDeleteField = (v: unknown): v is { __del: true } => !!v && typeof v === "object" && "__del" in v;
  // Extrai o nome da coleção de uma `collection(db, col)` ou de uma `query(collection(...), ...)`.
  const colDe = (q: { col?: unknown }): string => (typeof q.col === "string" ? q.col : colDe(q.col as { col?: unknown }));
  return {
    collection: (_db: unknown, col: string) => ({ col }),
    doc: (_db: unknown, col: string, id: string) => ref(col, id),
    serverTimestamp: () => "__ts__",
    arrayUnion: (...items: string[]): Operacao => ({ __op: "union", items }),
    arrayRemove: (...items: string[]): Operacao => ({ __op: "remove", items }),
    deleteField: () => ({ __del: true }) as const,
    where: (campo: string, op: string, valor: string) => {
      banco.filtros.push({ campo, op, valor });
      return { campo, op, valor };
    },
    query: (col: unknown, ...filtros: { campo: string; op: string; valor: string }[]) => ({ col, filtros }),
    onSnapshot: (_q: unknown, ok: (snap: unknown) => void) => {
      banco.ultimoSnapshot = { ok };
      return () => {};
    },
    getDocs: async (q: { col: unknown; filtros?: { campo: string; op: string; valor: string }[] }) => {
      const colName = colDe(q);
      const prefixo = `${colName}/`;
      const filtros = q.filtros ?? [];
      const docs = [...banco.store.entries()]
        .filter(([path]) => path.startsWith(prefixo))
        .filter(([, data]) => filtros.every((f) => data[f.campo] === f.valor)) // só "==" é usado hoje
        .map(([path, data]) => {
          const id = path.slice(prefixo.length);
          return { data: () => data, ref: ref(colName, id) };
        });
      return { docs, forEach: (fn: (d: (typeof docs)[number]) => void) => docs.forEach(fn), empty: docs.length === 0 };
    },
    runTransaction: async (_db: unknown, fn: (tx: Tx) => Promise<unknown>) => {
      banco.transacoes++;
      const tx = new Tx();
      const resultado = await fn(tx); // se lançar, nada é gravado
      tx.aplicar();
      return resultado;
    },
    setDoc: async (r: Ref, data: Doc, opts?: { merge?: boolean }) => {
      const atual: Doc = opts?.merge ? { ...(banco.store.get(r.path) ?? {}) } : {};
      for (const [k, v] of Object.entries(data)) {
        if (ehOperacao(v)) {
          const lista = Array.isArray(atual[k]) ? [...(atual[k] as string[])] : [];
          atual[k] =
            v.__op === "union"
              ? [...lista, ...v.items.filter((i) => !lista.includes(i))]
              : lista.filter((i) => !v.items.includes(i));
        } else {
          atual[k] = v;
        }
      }
      banco.store.set(r.path, atual);
    },
    addDoc: vi.fn(async (colRef: { col: string }, data: Doc) => {
      const id = `auto${++banco.autoId}`;
      // addDoc de verdade recusa valores `undefined` — o mock também, pra pegar o erro no teste.
      if (Object.values(data).some((v) => v === undefined)) throw new Error("Unsupported field value: undefined");
      banco.store.set(`${colRef.col}/${id}`, { ...data });
      return ref(colRef.col, id);
    }),
    updateDoc: vi.fn(async (r: Ref, data: Doc) => {
      const atual: Doc = { ...(banco.store.get(r.path) ?? {}) };
      for (const [k, v] of Object.entries(data)) {
        if (ehDeleteField(v)) delete atual[k];
        else atual[k] = v;
      }
      banco.store.set(r.path, atual);
    }),
    deleteDoc: vi.fn(async (r: Ref) => {
      banco.store.delete(r.path);
    }),
    writeBatch: vi.fn(() => {
      const escritas: (() => void)[] = [];
      return {
        set: (r: Ref, data: Doc) => escritas.push(() => banco.store.set(r.path, { ...data })),
        update: (r: Ref, data: Doc) =>
          escritas.push(() => banco.store.set(r.path, { ...(banco.store.get(r.path) ?? {}), ...data })),
        delete: (r: Ref) => escritas.push(() => banco.store.delete(r.path)),
        commit: async () => escritas.forEach((f) => f()),
      };
    }),
  };
});

import {
  normalizarAgenda,
  ouvirAgenda,
  ouvirSlots,
  ouvirSlotsOcupados,
  bloquearHorarios,
  liberarHorarios,
  bloquearDias,
  liberarDias,
  criarAgendamento,
  criarAgendamentoManual,
  recusarAgendamento,
  addServico,
  updateServico,
  HorarioOcupadoError,
} from "./db";
import { hojeKey } from "./utils";

const slot = (data: string, hora: string, status: string) => ({ data, hora, status, criadoEm: "__ts__" });
const semear = (data: string, hora: string, status: string) =>
  banco.store.set(`slots/${data}_${hora}`, slot(data, hora, status));

beforeEach(() => {
  banco.store.clear();
  banco.transacoes = 0;
  banco.ultimoSnapshot = null;
  banco.filtros.length = 0;
  banco.autoId = 0;
});

describe("normalizarAgenda", () => {
  it("documento inexistente vira agenda vazia completa", () => {
    expect(normalizarAgenda(undefined)).toEqual({ dias: {}, bloqueios: [] });
    expect(normalizarAgenda(null)).toEqual({ dias: {}, bloqueios: [] });
  });

  it("documento só com folgas (sem `dias`) não deixa `dias` indefinido", () => {
    const a = normalizarAgenda({ bloqueios: ["2030-05-10"] });
    expect(a.dias).toEqual({});
    expect(a.bloqueios).toEqual(["2030-05-10"]);
  });

  it("documento só com `dias` traz `bloqueios` vazio", () => {
    expect(normalizarAgenda({ dias: { "1": ["09:00"] } })).toEqual({ dias: { "1": ["09:00"] }, bloqueios: [] });
  });

  it("ignora lixo: dia que não é lista e itens que não são texto", () => {
    const a = normalizarAgenda({ dias: { "1": "09:00", "2": ["10:00", 5, null] }, bloqueios: ["2030-01-01", 7] });
    expect(a.dias).toEqual({ "1": [], "2": ["10:00"] });
    expect(a.bloqueios).toEqual(["2030-01-01"]);
  });

  it("guarda a antecedência escolhida pela dona (só as opções que o painel oferece)", () => {
    expect(normalizarAgenda({ antecedenciaDias: 90 }).antecedenciaDias).toBe(90);
    expect(normalizarAgenda({ antecedenciaDias: 30 }).antecedenciaDias).toBe(30);
  });

  it("antecedência estranha (outro número, texto) é ignorada — vale o padrão", () => {
    expect(normalizarAgenda({ antecedenciaDias: 365 })).toEqual({ dias: {}, bloqueios: [] });
    expect(normalizarAgenda({ antecedenciaDias: "90" })).toEqual({ dias: {}, bloqueios: [] });
  });
});

describe("leitura", () => {
  it("ouvirAgenda entrega a agenda normalizada mesmo com doc só de folgas", () => {
    const cb = vi.fn();
    ouvirAgenda(cb);
    banco.ultimoSnapshot!.ok({ data: () => ({ bloqueios: ["2030-05-10"] }) });
    banco.ultimoSnapshot!.ok({ data: () => undefined });
    expect(cb).toHaveBeenNthCalledWith(1, { dias: {}, bloqueios: ["2030-05-10"] });
    expect(cb).toHaveBeenNthCalledWith(2, { dias: {}, bloqueios: [] });
  });

  it("ouvirSlots sem janela lê só de hoje em diante", () => {
    ouvirSlots(vi.fn());
    expect(banco.filtros).toEqual([{ campo: "data", op: ">=", valor: hojeKey() }]);
  });

  it("ouvirSlots com janela limita o início e o fim", () => {
    ouvirSlots(vi.fn(), { desde: "2030-01-02", ate: "2030-01-16" });
    expect(banco.filtros).toEqual([
      { campo: "data", op: ">=", valor: "2030-01-02" },
      { campo: "data", op: "<=", valor: "2030-01-16" },
    ]);
  });

  it("ouvirSlotsOcupados separa os ocupados dos bloqueados", () => {
    const cb = vi.fn();
    ouvirSlotsOcupados(cb);
    const d = (id: string, status: string) => ({ id, data: () => ({ data: id.slice(0, 10), hora: id.slice(11), status }) });
    banco.ultimoSnapshot!.ok({
      docs: [d("2030-05-10_09:00", "confirmado"), d("2030-05-10_10:30", "bloqueado"), d("2030-05-10_14:00", "pendente")],
    });
    const [ocupados, bloqueados] = cb.mock.calls[0] as [Set<string>, Set<string>];
    expect([...ocupados].sort()).toEqual(["2030-05-10_09:00", "2030-05-10_10:30", "2030-05-10_14:00"]);
    expect([...bloqueados]).toEqual(["2030-05-10_10:30"]);
  });
});

describe("bloquearHorarios", () => {
  it("cria um slot bloqueado por horário, com os campos certos", async () => {
    const r = await bloquearHorarios([
      { data: "2030-05-10", hora: "09:00" },
      { data: "2030-05-10", hora: "10:30" },
    ]);
    expect(r.feitos).toHaveLength(2);
    expect(r.ignorados).toEqual([]);
    expect(banco.store.get("slots/2030-05-10_09:00")).toEqual(slot("2030-05-10", "09:00", "bloqueado"));
    expect(banco.store.get("slots/2030-05-10_10:30")).toEqual(slot("2030-05-10", "10:30", "bloqueado"));
  });

  it("só mexe em `slots`: nenhum agendamento é criado", async () => {
    await bloquearHorarios([{ data: "2030-05-10", hora: "09:00" }]);
    expect([...banco.store.keys()].every((k) => k.startsWith("slots/"))).toBe(true);
  });

  it("horário que já tem cliente NÃO é tocado e volta como ocupado", async () => {
    semear("2030-05-10", "09:00", "confirmado");
    semear("2030-05-10", "10:30", "pendente");
    const r = await bloquearHorarios([
      { data: "2030-05-10", hora: "09:00" },
      { data: "2030-05-10", hora: "10:30" },
      { data: "2030-05-10", hora: "13:00" },
    ]);
    expect(r.feitos).toEqual([{ data: "2030-05-10", hora: "13:00" }]);
    expect(r.ignorados.map((i) => i.motivo)).toEqual(["ocupado", "ocupado"]);
    expect(banco.store.get("slots/2030-05-10_09:00")?.status).toBe("confirmado");
    expect(banco.store.get("slots/2030-05-10_10:30")?.status).toBe("pendente");
  });

  it("horário já bloqueado é ignorado (idempotente)", async () => {
    semear("2030-05-10", "09:00", "bloqueado");
    const r = await bloquearHorarios([{ data: "2030-05-10", hora: "09:00" }]);
    expect(r.feitos).toEqual([]);
    expect(r.ignorados).toEqual([{ data: "2030-05-10", hora: "09:00", motivo: "ja-bloqueado" }]);
  });

  it("tira repetidos do pedido", async () => {
    const r = await bloquearHorarios([
      { data: "2030-05-10", hora: "09:00" },
      { data: "2030-05-10", hora: "09:00" },
    ]);
    expect(r.feitos).toHaveLength(1);
  });

  it("rejeita data ou hora em formato inválido e não grava nada", async () => {
    await expect(bloquearHorarios([{ data: "10/05/2030", hora: "09:00" }])).rejects.toThrow("alvo-invalido");
    await expect(bloquearHorarios([{ data: "2030-05-10", hora: "9h" }])).rejects.toThrow("alvo-invalido");
    expect(banco.store.size).toBe(0);
  });

  it("recusa lotes grandes demais e não grava nada", async () => {
    // Um horário por dia, em datas diferentes: n alvos válidos e distintos.
    const alvos = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ data: new Date(Date.UTC(2030, 0, 1 + i)).toISOString().slice(0, 10), hora: "09:00" }));
    await expect(bloquearHorarios(alvos(201))).rejects.toThrow("alvos-demais");
    expect(banco.store.size).toBe(0);
    expect((await bloquearHorarios(alvos(200))).feitos).toHaveLength(200); // o limite em si passa
  });

  it("lista vazia não abre transação", async () => {
    const r = await bloquearHorarios([]);
    expect(r).toEqual({ feitos: [], ignorados: [] });
    expect(banco.transacoes).toBe(0);
  });
});

describe("liberarHorarios", () => {
  it("apaga só o que está bloqueado", async () => {
    semear("2030-05-10", "09:00", "bloqueado");
    const r = await liberarHorarios([{ data: "2030-05-10", hora: "09:00" }]);
    expect(r.liberados).toEqual([{ data: "2030-05-10", hora: "09:00" }]);
    expect(banco.store.has("slots/2030-05-10_09:00")).toBe(false);
  });

  it("NUNCA apaga o horário de uma cliente (confirmado ou pendente)", async () => {
    semear("2030-05-10", "09:00", "confirmado");
    semear("2030-05-10", "10:30", "pendente");
    const r = await liberarHorarios([
      { data: "2030-05-10", hora: "09:00" },
      { data: "2030-05-10", hora: "10:30" },
    ]);
    expect(r.liberados).toEqual([]);
    expect(r.ignorados).toHaveLength(2);
    expect(banco.store.has("slots/2030-05-10_09:00")).toBe(true);
    expect(banco.store.has("slots/2030-05-10_10:30")).toBe(true);
  });

  it("horário que não existe é ignorado sem erro", async () => {
    const r = await liberarHorarios([{ data: "2030-05-10", hora: "09:00" }]);
    expect(r.liberados).toEqual([]);
    expect(r.ignorados).toHaveLength(1);
  });
});

describe("folgas de dia inteiro", () => {
  it("bloquearDias acrescenta sem apagar as folgas nem os horários da semana", async () => {
    banco.store.set("disponibilidade/regras", { dias: { "1": ["09:00"] }, bloqueios: ["2030-05-01"] });
    await bloquearDias(["2030-05-10", "2030-05-01"]);
    expect(banco.store.get("disponibilidade/regras")).toEqual({
      dias: { "1": ["09:00"] },
      bloqueios: ["2030-05-01", "2030-05-10"],
    });
  });

  it("liberarDias tira só as datas pedidas", async () => {
    banco.store.set("disponibilidade/regras", { dias: {}, bloqueios: ["2030-05-01", "2030-05-10"] });
    await liberarDias(["2030-05-10"]);
    expect(banco.store.get("disponibilidade/regras")?.bloqueios).toEqual(["2030-05-01"]);
  });

  it("valida o formato e ignora lista vazia", async () => {
    await expect(bloquearDias(["amanhã"])).rejects.toThrow("alvo-invalido");
    await expect(liberarDias(["amanhã"])).rejects.toThrow("alvo-invalido");
    await bloquearDias([]);
    expect(banco.store.size).toBe(0);
  });
});

describe("criarAgendamentoManual", () => {
  const novo = {
    servicos: [{ nome: "Alongamento", preco: 180 }],
    total: 180,
    clienteNome: "Ana Souza",
    clienteWhatsapp: "",
    data: "2030-05-10",
    hora: "14:00",
    diaLabel: "sex, 10/05",
  };

  it("grava o horário e o agendamento como confirmado", async () => {
    const id = await criarAgendamentoManual(novo);
    expect(id).toBe("2030-05-10_14:00");
    expect(banco.store.get("slots/2030-05-10_14:00")?.status).toBe("confirmado");
    expect(banco.store.get("agendamentos/2030-05-10_14:00")).toMatchObject({ clienteNome: "Ana Souza", status: "confirmado" });
  });

  it("não sobrescreve um horário bloqueado: dá erro e não grava nada", async () => {
    semear("2030-05-10", "14:00", "bloqueado");
    const antes = JSON.stringify([...banco.store.entries()]);
    await expect(criarAgendamentoManual(novo)).rejects.toBeInstanceOf(HorarioOcupadoError);
    expect(JSON.stringify([...banco.store.entries()])).toBe(antes);
  });

  it("não sobrescreve o horário de outra cliente", async () => {
    semear("2030-05-10", "14:00", "confirmado");
    banco.store.set("agendamentos/2030-05-10_14:00", { clienteNome: "Outra Cliente" });
    await expect(criarAgendamentoManual(novo)).rejects.toMatchObject({ code: "horario-ocupado" });
    expect(banco.store.get("agendamentos/2030-05-10_14:00")).toEqual({ clienteNome: "Outra Cliente" });
  });

  it("sem `bloquearApos`, só grava o horário principal (compatível com quem já chamava assim)", async () => {
    await criarAgendamentoManual(novo);
    expect([...banco.store.keys()].sort()).toEqual(["agendamentos/2030-05-10_14:00", "slots/2030-05-10_14:00"]);
  });

  it("com `bloquearApos`, bloqueia também os horários seguintes, marcados com a origem", async () => {
    const id = await criarAgendamentoManual(novo, ["14:30", "15:00"]);
    expect(banco.store.get("slots/2030-05-10_14:30")).toEqual({
      data: "2030-05-10", hora: "14:30", status: "bloqueado", criadoEm: "__ts__", origemAgendamento: id,
    });
    expect(banco.store.get("slots/2030-05-10_15:00")?.origemAgendamento).toBe(id);
  });

  it("se um dos horários que a duração afeta já está ocupado, NADA é gravado (nem o principal)", async () => {
    semear("2030-05-10", "15:00", "pendente");
    const antes = JSON.stringify([...banco.store.entries()]);
    await expect(criarAgendamentoManual(novo, ["14:30", "15:00"])).rejects.toBeInstanceOf(HorarioOcupadoError);
    expect(JSON.stringify([...banco.store.entries()])).toBe(antes);
  });

  it("ignora a própria hora e repetidos na lista de `bloquearApos`", async () => {
    await criarAgendamentoManual(novo, ["14:00", "14:30", "14:30"]);
    expect([...banco.store.keys()].sort()).toEqual([
      "agendamentos/2030-05-10_14:00",
      "slots/2030-05-10_14:00",
      "slots/2030-05-10_14:30",
    ]);
  });
});

describe("criarAgendamento (site, pedido público)", () => {
  const novo = {
    servicos: [{ nome: "Alongamento", preco: 180 }],
    total: 180,
    clienteNome: "Ana Souza",
    clienteWhatsapp: "15999998888",
    data: "2030-05-10",
    hora: "14:00",
    diaLabel: "sex, 10/05",
  };

  it("grava o slot pendente + o agendamento, de forma atômica", async () => {
    const id = await criarAgendamento(novo);
    expect(id).toBe("2030-05-10_14:00");
    expect(banco.store.get("slots/2030-05-10_14:00")?.status).toBe("pendente");
    expect(banco.store.get("agendamentos/2030-05-10_14:00")).toMatchObject({ clienteNome: "Ana Souza", status: "pendente" });
  });

  it("horário já ocupado: erro `horario-ocupado`, nada é gravado", async () => {
    semear("2030-05-10", "14:00", "pendente");
    const antes = JSON.stringify([...banco.store.entries()]);
    await expect(criarAgendamento(novo)).rejects.toMatchObject({ code: "horario-ocupado" });
    expect(JSON.stringify([...banco.store.entries()])).toBe(antes);
  });

  it("com `bloquearApos`, também bloqueia os horários seguintes com a origem", async () => {
    const id = await criarAgendamento(novo, ["14:30"]);
    expect(banco.store.get("slots/2030-05-10_14:30")).toMatchObject({ status: "bloqueado", origemAgendamento: id });
  });

  it("horário seguinte já ocupado: nem o pedido principal é criado", async () => {
    semear("2030-05-10", "14:30", "bloqueado");
    const antes = JSON.stringify([...banco.store.entries()]);
    await expect(criarAgendamento(novo, ["14:30"])).rejects.toBeInstanceOf(HorarioOcupadoError);
    expect(JSON.stringify([...banco.store.entries()])).toBe(antes);
  });
});

describe("recusarAgendamento", () => {
  it("apaga o slot e o agendamento", async () => {
    semear("2030-05-10", "14:00", "confirmado");
    banco.store.set("agendamentos/2030-05-10_14:00", { clienteNome: "Ana" });
    await recusarAgendamento("2030-05-10_14:00");
    expect(banco.store.has("slots/2030-05-10_14:00")).toBe(false);
    expect(banco.store.has("agendamentos/2030-05-10_14:00")).toBe(false);
  });

  it("libera junto o horário que tinha sido bloqueado AUTOMATICAMENTE por causa dele", async () => {
    const id = "2030-05-10_14:00";
    semear("2030-05-10", "14:00", "confirmado");
    banco.store.set("agendamentos/2030-05-10_14:00", { clienteNome: "Ana" });
    banco.store.set("slots/2030-05-10_14:30", { data: "2030-05-10", hora: "14:30", status: "bloqueado", origemAgendamento: id });
    await recusarAgendamento(id);
    expect(banco.store.has("slots/2030-05-10_14:30")).toBe(false);
  });

  it("NÃO mexe num bloqueio manual (sem `origemAgendamento`) nem no de outro agendamento", async () => {
    const id = "2030-05-10_14:00";
    semear("2030-05-10", "14:00", "confirmado");
    banco.store.set("agendamentos/2030-05-10_14:00", { clienteNome: "Ana" });
    semear("2030-05-10", "16:00", "bloqueado"); // bloqueio manual, sem origem
    banco.store.set("slots/2030-05-10_18:00", { data: "2030-05-10", hora: "18:00", status: "bloqueado", origemAgendamento: "outro-id" });
    await recusarAgendamento(id);
    expect(banco.store.has("slots/2030-05-10_16:00")).toBe(true);
    expect(banco.store.has("slots/2030-05-10_18:00")).toBe(true);
  });

  it("agendamento sem nenhum bloqueio automático (o caso de sempre): comportamento idêntico ao de antes", async () => {
    semear("2030-05-10", "09:00", "confirmado");
    banco.store.set("agendamentos/2030-05-10_09:00", { clienteNome: "Bruna" });
    await recusarAgendamento("2030-05-10_09:00");
    expect(banco.store.size).toBe(0);
  });
});

describe("addServico / updateServico: duração opcional", () => {
  it("addServico sem duração não grava o campo (evita o erro de `undefined` no Firestore)", async () => {
    await addServico({ nome: "Esmaltação", desc: "", preco: 50, destaque: false, duracaoMin: undefined });
    const salvo = banco.store.get("servicos/auto1");
    expect(salvo).toBeDefined();
    expect("duracaoMin" in (salvo as object)).toBe(false);
  });

  it("addServico com duração grava o número normalmente", async () => {
    await addServico({ nome: "Alongamento", desc: "", preco: 120, destaque: false, duracaoMin: 90 });
    expect(banco.store.get("servicos/auto1")?.duracaoMin).toBe(90);
  });

  it("updateServico com duração escreve o número", async () => {
    banco.store.set("servicos/s1", { nome: "Antigo", desc: "", preco: 50, destaque: false });
    await updateServico("s1", { nome: "Antigo", desc: "", preco: 50, destaque: false, duracaoMin: 60 });
    expect(banco.store.get("servicos/s1")?.duracaoMin).toBe(60);
  });

  it("updateServico limpando o campo REMOVE a duração salva antes (deleteField, não fica pra trás)", async () => {
    banco.store.set("servicos/s1", { nome: "Antigo", desc: "", preco: 50, destaque: false, duracaoMin: 60 });
    await updateServico("s1", { nome: "Antigo", desc: "", preco: 50, destaque: false, duracaoMin: undefined });
    const salvo = banco.store.get("servicos/s1");
    expect("duracaoMin" in (salvo as object)).toBe(false);
  });
});
