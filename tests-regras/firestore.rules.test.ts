// Testes das regras de segurança do Firestore, rodando contra o EMULADOR de verdade (não um
// banco falso). Cobre leitura/escrita pública x da dona, o acoplamento slot↔agendamento (nunca
// um sem o outro), os payloads exatos que `src/lib/db.ts` grava, e o bloqueio automático da
// duração dos serviços (`origemAgendamento`). Rodar com `npm run test:regras` (sobe o emulador
// sozinho) — precisa do Java (ver README do script).
import * as fs from "node:fs";
import * as path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

const UID_DONA = "iT3CQL7BYuX7wSpne5cDOXtSrsx2"; // mesmo UID de firestore.rules
const UID_INTRUSA = "umaContaQualquerLogada";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-carin",
    firestore: {
      rules: fs.readFileSync(path.join(process.cwd(), "firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const publico = () => testEnv.unauthenticatedContext().firestore();
const dona = () => testEnv.authenticatedContext(UID_DONA).firestore();
const intrusa = () => testEnv.authenticatedContext(UID_INTRUSA).firestore();
const ts = () => firebase.firestore.FieldValue.serverTimestamp();

/** Grava direto, sem passar pelas regras — só pra preparar o cenário (não é o que testamos). */
async function semear(colecao: string, id: string, dados: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection(colecao).doc(id).set(dados);
  });
}

// ---------- Payloads iguais aos que src/lib/db.ts realmente grava ----------
const slotPendente = (data = "2030-05-10", hora = "14:00") => ({ data, hora, status: "pendente", criadoEm: ts() });
const slotConfirmado = (data = "2030-05-10", hora = "14:00") => ({ data, hora, status: "confirmado", criadoEm: ts() });
const slotBloqueado = (data = "2030-05-10", hora = "14:00") => ({ data, hora, status: "bloqueado", criadoEm: ts() });
const slotBloqueadoAuto = (origemAgendamento: string, data = "2030-05-10", hora = "15:30") => ({
  data, hora, status: "bloqueado", criadoEm: ts(), origemAgendamento,
});
const agendamentoPendente = (data = "2030-05-10", hora = "14:00") => ({
  servicos: [{ nome: "Alongamento", preco: 120 }],
  total: 120,
  clienteNome: "Ana Souza",
  clienteWhatsapp: "15999998888",
  data,
  hora,
  diaLabel: "sex, 10/05",
  status: "pendente",
  criadoEm: ts(),
});
const agendamentoConfirmado = (data = "2030-05-10", hora = "14:00") => ({
  ...agendamentoPendente(data, hora),
  status: "confirmado",
});

describe("leitura", () => {
  it("público lê servicos, disponibilidade e slots", async () => {
    await semear("servicos", "s1", { nome: "Alongamento", desc: "", preco: 120, destaque: false });
    await semear("disponibilidade", "regras", { dias: {}, bloqueios: [] });
    await semear("slots", "2030-05-10_09:00", slotPendente());
    await assertSucceeds(publico().collection("servicos").doc("s1").get());
    await assertSucceeds(publico().collection("disponibilidade").doc("regras").get());
    await assertSucceeds(publico().collection("slots").doc("2030-05-10_09:00").get());
  });

  it("público NÃO lê agendamentos nem config", async () => {
    await semear("agendamentos", "2030-05-10_09:00", agendamentoPendente());
    await semear("config", "studio", { nome: "Carin" });
    await assertFails(publico().collection("agendamentos").doc("2030-05-10_09:00").get());
    await assertFails(publico().collection("config").doc("studio").get());
  });

  it("a dona lê agendamentos e config; outra conta logada não", async () => {
    await semear("agendamentos", "2030-05-10_09:00", agendamentoPendente());
    await semear("config", "studio", { nome: "Carin" });
    await assertSucceeds(dona().collection("agendamentos").doc("2030-05-10_09:00").get());
    await assertSucceeds(dona().collection("config").doc("studio").get());
    await assertFails(intrusa().collection("agendamentos").doc("2030-05-10_09:00").get());
  });
});

describe("escrita pública nas coleções restritas: sempre falha", () => {
  it.each(["servicos", "disponibilidade", "config", "pushTokens"])("%s", async (col) => {
    await assertFails(publico().collection(col).doc("x").set({ qualquer: "coisa" }));
  });
});

describe("pedido público (criarAgendamento — site)", () => {
  async function pedido(overridesSlot = {}, overridesAg = {}, data = "2030-05-10", hora = "14:00") {
    const id = `${data}_${hora}`;
    const db = publico();
    const batch = db.batch();
    batch.set(db.collection("slots").doc(id), { ...slotPendente(data, hora), ...overridesSlot });
    batch.set(db.collection("agendamentos").doc(id), { ...agendamentoPendente(data, hora), ...overridesAg });
    return batch.commit();
  }

  it("horário livre: slot + agendamento juntos passa", async () => {
    await assertSucceeds(pedido());
  });

  it("horário já ocupado (slot já existe): falha", async () => {
    await semear("slots", "2030-05-10_14:00", slotPendente());
    await assertFails(pedido());
  });

  it("agendamento avulso, sem o slot: falha", async () => {
    const db = publico();
    await assertFails(db.collection("agendamentos").doc("2030-05-10_14:00").set(agendamentoPendente()));
  });

  it("slot avulso, sem o agendamento: falha", async () => {
    const db = publico();
    await assertFails(db.collection("slots").doc("2030-05-10_14:00").set(slotPendente()));
  });

  it("slot com status diferente de pendente: falha", async () => {
    await assertFails(pedido({ status: "confirmado" }));
  });

  it("slot com campo extra (ex.: origemAgendamento): falha", async () => {
    await assertFails(pedido({ origemAgendamento: "algo" }));
  });

  it("slot com id que não bate com data_hora: falha", async () => {
    const db = publico();
    const batch = db.batch();
    batch.set(db.collection("slots").doc("2030-05-10_99:99"), slotPendente());
    batch.set(db.collection("agendamentos").doc("2030-05-10_99:99"), agendamentoPendente());
    await assertFails(batch.commit());
  });

  it("slot com data em formato inválido: falha", async () => {
    // O id precisa continuar batendo com "data_hora" (mesmo formato errado), senão o
    // teste acaba pego pela checagem de id, não pela de formato — a data errada tem
    // que ser a ÚNICA coisa fora do padrão. "/" no id vira separador de path no
    // Firestore, então o formato inválido usa "-" mesmo (mês sem o zero à esquerda).
    const db = publico();
    const batch = db.batch();
    batch.set(db.collection("slots").doc("2030-5-10_14:00"), { ...slotPendente(), data: "2030-5-10" });
    batch.set(db.collection("agendamentos").doc("2030-5-10_14:00"), { ...agendamentoPendente(), data: "2030-5-10" });
    await assertFails(batch.commit());
  });

  it("slot com hora em formato inválido: falha", async () => {
    const db = publico();
    const batch = db.batch();
    batch.set(db.collection("slots").doc("2030-05-10_9h"), { ...slotPendente(), hora: "9h" });
    batch.set(db.collection("agendamentos").doc("2030-05-10_9h"), { ...agendamentoPendente(), hora: "9h" });
    await assertFails(batch.commit());
  });

  it("criadoEm que não é o timestamp do servidor: falha", async () => {
    const dataFixa = firebase.firestore.Timestamp.fromDate(new Date("2020-01-01"));
    await assertFails(pedido({ criadoEm: dataFixa }, { criadoEm: dataFixa }));
  });

  it("agendamento com campo extra: falha", async () => {
    await assertFails(pedido({}, { origemAgendamento: "algo" }));
    await assertFails(pedido({}, { admin: true }, "2030-05-10", "15:00"));
  });

  it("agendamento com total que não é número: falha", async () => {
    await assertFails(pedido({}, { total: "120" }));
  });

  it("agendamento com total absurdamente alto: falha", async () => {
    await assertFails(pedido({}, { total: 999999999 }));
  });

  it("agendamento com nome de uma letra só: falha", async () => {
    await assertFails(pedido({}, { clienteNome: "A" }));
  });

  it("agendamento com WhatsApp curto demais: falha", async () => {
    await assertFails(pedido({}, { clienteWhatsapp: "123" }));
  });

  it("agendamento com id divergente de data_hora: falha", async () => {
    const db = publico();
    const batch = db.batch();
    batch.set(db.collection("slots").doc("2030-05-10_14:00"), slotPendente());
    batch.set(db.collection("agendamentos").doc("2030-05-10_14:00"), { ...agendamentoPendente(), hora: "15:00" });
    await assertFails(batch.commit());
  });
});

describe("pedido público com serviço longo (bloqueio automático do horário seguinte)", () => {
  /** Pedido às 14:00 + bloqueios automáticos, tudo na mesma escrita (como criarAgendamento faz). */
  async function pedidoComBloqueios(bloqueios: Record<string, unknown>[], hora = "14:00") {
    const id = `2030-05-10_${hora}`;
    const db = publico();
    const batch = db.batch();
    batch.set(db.collection("slots").doc(id), slotPendente("2030-05-10", hora));
    batch.set(db.collection("agendamentos").doc(id), agendamentoPendente("2030-05-10", hora));
    for (const b of bloqueios) batch.set(db.collection("slots").doc(`${b.data}_${b.hora}`), b);
    return batch.commit();
  }

  it("pedido + bloqueios dos horários seguintes, na mesma escrita: passa", async () => {
    await assertSucceeds(
      pedidoComBloqueios([
        slotBloqueadoAuto("2030-05-10_14:00", "2030-05-10", "15:00"),
        slotBloqueadoAuto("2030-05-10_14:00", "2030-05-10", "15:30"),
      ]),
    );
  });

  it("bloqueio pendurado num pedido que já existia antes (não nasce nesta escrita): falha", async () => {
    await semear("agendamentos", "2030-05-10_14:00", agendamentoPendente());
    await assertFails(publico().collection("slots").doc("2030-05-10_15:00").set(slotBloqueadoAuto("2030-05-10_14:00", "2030-05-10", "15:00")));
  });

  it("bloqueio sozinho, apontando pra pedido que não existe: falha", async () => {
    await assertFails(publico().collection("slots").doc("2030-05-10_15:00").set(slotBloqueadoAuto("2030-05-10_14:00", "2030-05-10", "15:00")));
  });

  it("bloqueio ANTES do horário do pedido: falha", async () => {
    await assertFails(pedidoComBloqueios([slotBloqueadoAuto("2030-05-10_14:00", "2030-05-10", "13:00")]));
  });

  it("bloqueio em OUTRO dia: falha", async () => {
    await assertFails(pedidoComBloqueios([slotBloqueadoAuto("2030-05-10_14:00", "2030-05-11", "15:00")]));
  });

  it("bloqueio em cima de um horário já ocupado: falha (o pedido inteiro não acontece)", async () => {
    await semear("slots", "2030-05-10_15:00", slotPendente("2030-05-10", "15:00"));
    await assertFails(pedidoComBloqueios([slotBloqueadoAuto("2030-05-10_14:00", "2030-05-10", "15:00")]));
  });

  it("bloqueio sem origemAgendamento (bloqueio 'manual' pelo público): falha", async () => {
    await assertFails(pedidoComBloqueios([slotBloqueado("2030-05-10", "15:00")]));
  });

  it("bloqueio com campo extra: falha", async () => {
    await assertFails(
      pedidoComBloqueios([{ ...slotBloqueadoAuto("2030-05-10_14:00", "2030-05-10", "15:00"), motivo: "x" }]),
    );
  });
});

describe("a dona cria (agendamento manual + bloqueios)", () => {
  it("agendamento manual: slot confirmado + agendamento confirmado juntos passa", async () => {
    const db = dona();
    const batch = db.batch();
    batch.set(db.collection("slots").doc("2030-05-10_14:00"), slotConfirmado());
    batch.set(db.collection("agendamentos").doc("2030-05-10_14:00"), agendamentoConfirmado());
    await assertSucceeds(batch.commit());
  });

  it("slot confirmado avulso, sem o agendamento junto: falha (mesma trava vale pra dona)", async () => {
    await assertFails(dona().collection("slots").doc("2030-05-10_14:00").set(slotConfirmado()));
  });

  it("agendamento avulso, sem o slot junto: falha", async () => {
    await assertFails(dona().collection("agendamentos").doc("2030-05-10_14:00").set(agendamentoConfirmado()));
  });

  it("bloqueio manual (folha 'Bloquear horários'), sem par: passa sozinho", async () => {
    await assertSucceeds(dona().collection("slots").doc("2030-05-10_14:00").set(slotBloqueado()));
  });

  it("bloqueio AUTOMÁTICO da duração: slot bloqueado com origemAgendamento, criado junto do agendamento, passa", async () => {
    const db = dona();
    const batch = db.batch();
    batch.set(db.collection("slots").doc("2030-05-10_14:00"), slotConfirmado());
    batch.set(db.collection("agendamentos").doc("2030-05-10_14:00"), agendamentoConfirmado());
    batch.set(db.collection("slots").doc("2030-05-10_15:30"), slotBloqueadoAuto("2030-05-10_14:00"));
    await assertSucceeds(batch.commit());
  });

  it("bloqueio AUTOMÁTICO apontando pra um agendamento que não existe: falha", async () => {
    await assertFails(dona().collection("slots").doc("2030-05-10_15:30").set(slotBloqueadoAuto("2030-05-10_14:00")));
  });

  it("slot com campo desconhecido: falha mesmo pra dona", async () => {
    await assertFails(dona().collection("slots").doc("2030-05-10_14:00").set({ ...slotBloqueado(), motivo: "viagem" }));
  });

  it("outra conta logada (não a dona) cai no ramo público e falha do mesmo jeito", async () => {
    await assertFails(intrusa().collection("slots").doc("2030-05-10_14:00").set(slotConfirmado()));
  });
});

describe("confirmar (update pendente → confirmado)", () => {
  beforeEach(async () => {
    await semear("slots", "2030-05-10_14:00", slotPendente());
    await semear("agendamentos", "2030-05-10_14:00", agendamentoPendente());
  });

  it("a dona confirma os dois juntos (payload de confirmarAgendamento), mudando só o status", async () => {
    const db = dona();
    const batch = db.batch();
    batch.update(db.collection("slots").doc("2030-05-10_14:00"), { status: "confirmado" });
    batch.update(db.collection("agendamentos").doc("2030-05-10_14:00"), { status: "confirmado" });
    await assertSucceeds(batch.commit());
  });

  it("mudar outro campo junto do status: falha", async () => {
    await assertFails(
      dona().collection("agendamentos").doc("2030-05-10_14:00").update({ status: "confirmado", total: 999 }),
    );
  });

  it("mudar 'servicos' junto do status também falha (confere cada campo, não só total)", async () => {
    await assertFails(
      dona()
        .collection("agendamentos")
        .doc("2030-05-10_14:00")
        .update({ status: "confirmado", servicos: [{ nome: "Outro", preco: 1 }] }),
    );
  });

  it("pular direto pra 'bloqueado' num update: falha (não é a transição permitida)", async () => {
    await assertFails(dona().collection("slots").doc("2030-05-10_14:00").update({ status: "bloqueado" }));
  });

  it("confirmado → outra coisa: falha (só pendente → confirmado é permitido)", async () => {
    await semear("slots", "2030-05-10_16:00", slotConfirmado("2030-05-10", "16:00"));
    await assertFails(dona().collection("slots").doc("2030-05-10_16:00").update({ status: "pendente" }));
  });

  it("o público não confirma nada", async () => {
    await assertFails(publico().collection("slots").doc("2030-05-10_14:00").update({ status: "confirmado" }));
  });
});

describe("apagar (recusar / cancelar / liberar)", () => {
  it("a dona apaga slot e agendamento juntos (recusarAgendamento)", async () => {
    await semear("slots", "2030-05-10_14:00", slotPendente());
    await semear("agendamentos", "2030-05-10_14:00", agendamentoPendente());
    const db = dona();
    const batch = db.batch();
    batch.delete(db.collection("slots").doc("2030-05-10_14:00"));
    batch.delete(db.collection("agendamentos").doc("2030-05-10_14:00"));
    await assertSucceeds(batch.commit());
  });

  it("recusarAgendamento libera junto o bloqueio automático (origemAgendamento)", async () => {
    await semear("slots", "2030-05-10_14:00", slotConfirmado());
    await semear("agendamentos", "2030-05-10_14:00", agendamentoConfirmado());
    await semear("slots", "2030-05-10_15:30", slotBloqueadoAuto("2030-05-10_14:00"));
    const db = dona();
    const batch = db.batch();
    batch.delete(db.collection("slots").doc("2030-05-10_14:00"));
    batch.delete(db.collection("agendamentos").doc("2030-05-10_14:00"));
    batch.delete(db.collection("slots").doc("2030-05-10_15:30"));
    await assertSucceeds(batch.commit());
  });

  it("liberarHorarios apaga um bloqueio manual", async () => {
    await semear("slots", "2030-05-10_14:00", slotBloqueado());
    await assertSucceeds(dona().collection("slots").doc("2030-05-10_14:00").delete());
  });

  it("o público não apaga nada", async () => {
    await semear("slots", "2030-05-10_14:00", slotPendente());
    await semear("agendamentos", "2030-05-10_14:00", agendamentoPendente());
    await assertFails(publico().collection("slots").doc("2030-05-10_14:00").delete());
    await assertFails(publico().collection("agendamentos").doc("2030-05-10_14:00").delete());
  });
});
