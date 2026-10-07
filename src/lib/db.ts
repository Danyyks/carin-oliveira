// Camada de dados (Firestore) — serviços e disponibilidade.
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  getDocs,
  setDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  query,
  where,
  runTransaction,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";
import { hojeKey } from "./utils";
import { ANTECEDENCIAS } from "./agendaDia";

// ---------- Serviços ----------
export type ServicoDoc = {
  id: string;
  nome: string;
  desc: string;
  preco: number;
  destaque: boolean; // "Mais pedido": ganha selo e aparece no topo da lista
  duracaoMin?: number; // duração em minutos (opcional); sem ela, o serviço não bloqueia horário seguinte
};
export type ServicoInput = Omit<ServicoDoc, "id">;

/** Ordena a tabela de preços: destacados primeiro, depois em ordem alfabética. */
export function ordenarServicos<T extends { nome: string; destaque?: boolean }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const da = a.destaque ? 0 : 1;
    const db = b.destaque ? 0 : 1;
    if (da !== db) return da - db;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

/**
 * Escuta os serviços em tempo real (destacados primeiro, depois alfabética).
 * `onErro` é opcional — quem só quer o comportamento de sempre (log no console) não
 * passa nada; o painel novo usa para degradar só essa fonte, sem quebrar o resto.
 */
export function ouvirServicos(cb: (servicos: ServicoDoc[]) => void, onErro?: (e: unknown) => void) {
  return onSnapshot(
    collection(db, "servicos"),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ServicoDoc, "id">) }));
      cb(ordenarServicos(list));
    },
    (e) => {
      console.error("ouvirServicos:", e);
      onErro?.(e);
    },
  );
}
// `addDoc` recusa campos `undefined`: sem duração, o campo simplesmente não é enviado.
export const addServico = (data: ServicoInput) => {
  const payload: Record<string, unknown> = { ...data };
  if (payload.duracaoMin === undefined) delete payload.duracaoMin;
  return addDoc(collection(db, "servicos"), payload);
};
// Ao editar, limpar o campo de duração REMOVE a duração salva (deleteField), não deixa
// o valor antigo pra trás — diferente de addServico, updateDoc não aceita `undefined`.
export const updateServico = (id: string, data: ServicoInput) =>
  updateDoc(doc(db, "servicos", id), { ...data, duracaoMin: data.duracaoMin ?? deleteField() });
export const removeServico = (id: string) => deleteDoc(doc(db, "servicos", id));

// ---------- Disponibilidade (dias/horários + folgas) ----------
// dias: chave = dia da semana ("0"=domingo ... "6"=sábado), valor = horários "HH:MM".
// bloqueios: datas específicas de folga ("YYYY-MM-DD") em que a dona não atende.
// antecedenciaDias: até quantos dias à frente o site deixa a cliente marcar (escolha da dona;
// opções e padrão em `ANTECEDENCIAS`/`antecedenciaDe`, agendaDia.ts).
export type Agenda = { dias: Record<string, string[]>; bloqueios?: string[]; antecedenciaDias?: number };

const regrasRef = () => doc(db, "disponibilidade", "regras");

/**
 * Deixa a agenda sempre completa. O documento pode faltar (ainda não configurado) ou
 * existir só com as folgas (`bloqueios`) — nesse caso `dias` viria indefinido e quebraria
 * quem lê. Aqui `dias` e `bloqueios` saem sempre preenchidos.
 */
export function normalizarAgenda(raw: unknown): Agenda {
  const r = (raw && typeof raw === "object" ? raw : {}) as { dias?: unknown; bloqueios?: unknown; antecedenciaDias?: unknown };
  const dias: Record<string, string[]> = {};
  if (r.dias && typeof r.dias === "object") {
    for (const [k, v] of Object.entries(r.dias as Record<string, unknown>)) {
      dias[k] = Array.isArray(v) ? v.filter((h): h is string => typeof h === "string") : [];
    }
  }
  const bloqueios = Array.isArray(r.bloqueios) ? r.bloqueios.filter((d): d is string => typeof d === "string") : [];
  // Só um valor que o painel oferece é aceito; qualquer outra coisa cai no padrão (campo ausente).
  const ant = r.antecedenciaDias;
  if (typeof ant === "number" && (ANTECEDENCIAS as readonly number[]).includes(ant)) {
    return { dias, bloqueios, antecedenciaDias: ant };
  }
  return { dias, bloqueios };
}

export function ouvirAgenda(cb: (agenda: Agenda) => void, onErro?: (e: unknown) => void) {
  return onSnapshot(
    regrasRef(),
    (d) => cb(normalizarAgenda(d.data())),
    (e) => {
      console.error("ouvirAgenda:", e);
      onErro?.(e);
    },
  );
}
// Salva só os dias/horários, preservando as folgas (merge não apaga `bloqueios`).
export const salvarAgenda = (agenda: Agenda) =>
  setDoc(regrasRef(), { dias: agenda.dias }, { merge: true });

// Salva só as folgas (datas), preservando os dias/horários.
export const salvarBloqueios = (datas: string[]) =>
  setDoc(regrasRef(), { bloqueios: datas }, { merge: true });

// Salva só até quando a agenda fica aberta pras clientes, preservando o resto.
export const salvarAntecedencia = (dias: number) =>
  setDoc(regrasRef(), { antecedenciaDias: dias }, { merge: true });

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^\d{2}:\d{2}$/;

/**
 * Marca datas como folga (dia inteiro) SEM regravar a lista toda: `arrayUnion` só
 * acrescenta, então dois aparelhos (ou o painel antigo e o novo) não se atropelam.
 */
export async function bloquearDias(datas: string[]) {
  const lista = [...new Set(datas)];
  if (lista.length === 0) return;
  if (!lista.every((d) => RE_DATA.test(d))) throw new Error("alvo-invalido");
  await setDoc(regrasRef(), { bloqueios: arrayUnion(...lista) }, { merge: true });
}

/** Tira datas da lista de folgas (o inverso de `bloquearDias`). */
export async function liberarDias(datas: string[]) {
  const lista = [...new Set(datas)];
  if (lista.length === 0) return;
  if (!lista.every((d) => RE_DATA.test(d))) throw new Error("alvo-invalido");
  await setDoc(regrasRef(), { bloqueios: arrayRemove(...lista) }, { merge: true });
}

// ---------- Agendamentos ----------
export type ServicoAgendado = { nome: string; preco: number };

export type Agendamento = {
  id: string; // = `${data}_${hora}` (id determinístico = trava anti-duplicidade)
  servicos: ServicoAgendado[]; // um ou mais serviços no mesmo horário
  total: number; // soma dos preços
  clienteNome: string;
  clienteWhatsapp: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  diaLabel: string; // ex.: "sáb, 14/09"
  status: "pendente" | "confirmado";
};
export type NovoAgendamento = Omit<Agendamento, "id" | "status">;

// ---------- Horários ocupados (coleção pública `slots`) ----------
/** pendente/confirmado = tem cliente; bloqueado = a dona fechou o horário (sem cliente). */
export type SlotStatus = "pendente" | "confirmado" | "bloqueado";
export type SlotDoc = {
  id: string;
  data: string;
  hora: string;
  status: SlotStatus;
  // Presente só nos bloqueios AUTOMÁTICOS (duração de um serviço comendo o horário
  // seguinte): id do agendamento que causou o bloqueio, pra liberar sozinho se ele for
  // cancelado. Bloqueio manual (folha "Bloquear horários") nunca tem esse campo.
  origemAgendamento?: string;
};
/** Janela de datas ("YYYY-MM-DD", inclusive) que limita a leitura ao que interessa. */
export type JanelaSlots = { desde?: string; ate?: string };

/**
 * Escuta os horários (só data/hora/status — sem dados do cliente) numa janela de datas.
 * Sem `desde`, começa em hoje: horários de dias que já passaram não importam e, sem esse
 * filtro, cada abertura do site leria o histórico inteiro (a cota grátis do Firestore é
 * de leituras por dia).
 */
export function ouvirSlots(cb: (slots: SlotDoc[]) => void, janela: JanelaSlots = {}, onErro?: (e: unknown) => void) {
  const filtros = [where("data", ">=", janela.desde ?? hojeKey())];
  if (janela.ate) filtros.push(where("data", "<=", janela.ate));
  return onSnapshot(
    query(collection(db, "slots"), ...filtros),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SlotDoc, "id">) }))),
    (e) => {
      console.error("ouvirSlots:", e);
      onErro?.(e);
    },
  );
}

/**
 * Ids ocupados ("data_hora"), usados no site para esconder horários, e o subconjunto que
 * a dona bloqueou (o painel mostra "Bloqueado" em vez de um nome de cliente).
 */
export function ouvirSlotsOcupados(
  cb: (ocupados: Set<string>, bloqueados: Set<string>) => void,
  janela?: JanelaSlots,
) {
  return ouvirSlots(
    (slots) =>
      cb(
        new Set(slots.map((s) => s.id)),
        new Set(slots.filter((s) => s.status === "bloqueado").map((s) => s.id)),
      ),
    janela,
  );
}

// ---------- Bloqueio de horários (a dona fecha só alguns horários de uma data) ----------
// Bloquear = criar `slots/{data_hora}` com status "bloqueado" (sem motivo: a coleção é
// pública). O site já esconde qualquer doc de `slots`, e o id único impede um pedido
// público naquele horário. Liberar = apagar esse doc — nunca o de uma cliente.
export type Alvo = { data: string; hora: string };
export type MotivoIgnorado = "ja-bloqueado" | "ocupado";
export type ResultadoBloqueio = { feitos: Alvo[]; ignorados: (Alvo & { motivo: MotivoIgnorado })[] };
export type ResultadoLiberacao = { liberados: Alvo[]; ignorados: Alvo[] };
const MAX_ALVOS = 200; // cabe folgado no limite de 500 escritas por transação

/** O horário já tem alguém (ou está bloqueado): a escrita não acontece. */
export class HorarioOcupadoError extends Error {
  code = "horario-ocupado";
  constructor(mensagem = "Esse horário já está ocupado.") {
    super(mensagem);
  }
}

const idDe = (a: Alvo) => `${a.data}_${a.hora}`;

/** Confere o formato, tira repetidos e limita o tamanho do lote. */
function validarAlvos(alvos: Alvo[]): Alvo[] {
  const vistos = new Set<string>();
  const lista: Alvo[] = [];
  for (const a of alvos) {
    if (!RE_DATA.test(a.data) || !RE_HORA.test(a.hora)) throw new Error("alvo-invalido");
    if (vistos.has(idDe(a))) continue;
    vistos.add(idDe(a));
    lista.push({ data: a.data, hora: a.hora });
  }
  if (lista.length > MAX_ALVOS) throw new Error("alvos-demais");
  return lista;
}

/**
 * Bloqueia os horários pedidos. Numa transação (lê tudo, depois escreve): o que já tem
 * cliente ou já está bloqueado NÃO é tocado e volta em `ignorados`.
 */
export async function bloquearHorarios(alvos: Alvo[]): Promise<ResultadoBloqueio> {
  const lista = validarAlvos(alvos);
  if (lista.length === 0) return { feitos: [], ignorados: [] };
  return runTransaction(db, async (tx) => {
    const refs = lista.map((a) => doc(db, "slots", idDe(a)));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const feitos: Alvo[] = [];
    const ignorados: ResultadoBloqueio["ignorados"] = [];
    snaps.forEach((snap, i) => {
      const a = lista[i];
      if (snap.exists()) {
        ignorados.push({ ...a, motivo: snap.data()?.status === "bloqueado" ? "ja-bloqueado" : "ocupado" });
      } else {
        tx.set(refs[i], { data: a.data, hora: a.hora, status: "bloqueado", criadoEm: serverTimestamp() });
        feitos.push(a);
      }
    });
    return { feitos, ignorados };
  });
}

/** Libera horários bloqueados. Só apaga o que tem status "bloqueado" (nunca o de uma cliente). */
export async function liberarHorarios(alvos: Alvo[]): Promise<ResultadoLiberacao> {
  const lista = validarAlvos(alvos);
  if (lista.length === 0) return { liberados: [], ignorados: [] };
  return runTransaction(db, async (tx) => {
    const refs = lista.map((a) => doc(db, "slots", idDe(a)));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const liberados: Alvo[] = [];
    const ignorados: Alvo[] = [];
    snaps.forEach((snap, i) => {
      if (snap.exists() && snap.data()?.status === "bloqueado") {
        tx.delete(refs[i]);
        liberados.push(lista[i]);
      } else {
        ignorados.push(lista[i]);
      }
    });
    return { liberados, ignorados };
  });
}

/**
 * Cria o pedido: grava o slot público + o agendamento privado de forma atômica.
 * Se o horário já existir, o `set` vira um `update` no doc existente — e a regra
 * `update` (só a dona) barra a transação inteira. É o que impede dois clientes
 * pegarem o mesmo horário (o id determinístico "data_hora" garante a colisão).
 *
 * `bloquearApos` (opcional): horários da tabela que a duração do serviço come (ver
 * `horariosAfetados` em `agendaDia.ts`). Viram `slots` "bloqueado" com
 * `origemAgendamento` = este pedido, na mesma transação — as regras só aceitam do público
 * no mesmo dia, depois do horário do pedido e junto de um pedido novo
 * (`slotPublicoBloqueioOk`). Recusar/cancelar o pedido apaga esses bloqueios junto.
 */
export async function criarAgendamento(a: NovoAgendamento, bloquearApos: string[] = []) {
  const id = `${a.data}_${a.hora}`;
  const slotRef = doc(db, "slots", id);
  const extras = [...new Set(bloquearApos)].filter((h) => h !== a.hora);
  const extraRefs = extras.map((hora) => doc(db, "slots", `${a.data}_${hora}`));
  await runTransaction(db, async (tx) => {
    // Lê tudo antes de escrever: o horário principal e os que a duração do serviço exige.
    const [slotSnap, ...extraSnaps] = await Promise.all([tx.get(slotRef), ...extraRefs.map((r) => tx.get(r))]);
    if (slotSnap.exists() || extraSnaps.some((s) => s.exists())) throw new HorarioOcupadoError();
    tx.set(slotRef, { data: a.data, hora: a.hora, status: "pendente", criadoEm: serverTimestamp() });
    tx.set(doc(db, "agendamentos", id), { ...a, status: "pendente", criadoEm: serverTimestamp() });
    extraRefs.forEach((r, i) =>
      tx.set(r, { data: a.data, hora: extras[i], status: "bloqueado", criadoEm: serverTimestamp(), origemAgendamento: id }),
    );
  });
  return id;
}

/**
 * A dona registra um agendamento da agenda MANUAL dela (cliente que marcou por
 * fora). Entra já `confirmado` e trava o horário no site. Só a dona faz isso
 * (as regras liberam create para isDono).
 *
 * `bloquearApos` (opcional): horários da tabela que a duração do serviço come — ver
 * `horariosAfetados` em `agendaDia.ts`. Cada um vira um `slots` "bloqueado" marcado com
 * `origemAgendamento`, pra `recusarAgendamento` liberar sozinho se ela cancelar depois.
 */
export async function criarAgendamentoManual(a: NovoAgendamento, bloquearApos: string[] = []) {
  const id = `${a.data}_${a.hora}`;
  const slotRef = doc(db, "slots", id);
  const extras = [...new Set(bloquearApos)].filter((h) => h !== a.hora);
  const extraRefs = extras.map((hora) => doc(db, "slots", `${a.data}_${hora}`));
  await runTransaction(db, async (tx) => {
    // Lê antes de escrever: se o horário principal OU algum dos afetados pela duração já
    // tem alguém (ou já está bloqueado), não sobrescreve nada.
    const [slotSnap, ...extraSnaps] = await Promise.all([tx.get(slotRef), ...extraRefs.map((r) => tx.get(r))]);
    if (slotSnap.exists() || extraSnaps.some((s) => s.exists())) throw new HorarioOcupadoError();
    tx.set(slotRef, { data: a.data, hora: a.hora, status: "confirmado", criadoEm: serverTimestamp() });
    tx.set(doc(db, "agendamentos", id), { ...a, status: "confirmado", criadoEm: serverTimestamp() });
    extraRefs.forEach((r, i) =>
      tx.set(r, { data: a.data, hora: extras[i], status: "bloqueado", criadoEm: serverTimestamp(), origemAgendamento: id }),
    );
  });
  return id;
}

/** Escuta os agendamentos (só a dona lê) em tempo real, ordenados por data/hora. */
export function ouvirAgendamentos(cb: (ags: Agendamento[]) => void, onErro?: (e: unknown) => void) {
  return onSnapshot(
    collection(db, "agendamentos"),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Agendamento, "id">) }));
      list.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
      cb(list);
    },
    (e) => {
      console.error("ouvirAgendamentos:", e);
      onErro?.(e);
    },
  );
}

/** Confirma o agendamento (slot + registro viram "confirmado"). */
export async function confirmarAgendamento(id: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, "slots", id), { status: "confirmado" });
  batch.update(doc(db, "agendamentos", id), { status: "confirmado" });
  await batch.commit();
}

/**
 * Recusa/cancela: apaga o slot e o registro, liberando o horário — e junto qualquer
 * horário seguinte que tinha sido bloqueado SOZINHO por causa da duração deste
 * agendamento (nunca um bloqueio manual da folha "Bloquear horários", que não tem
 * `origemAgendamento`). Agendamentos antigos (de antes dessa função existir) nunca têm
 * um bloqueio com essa origem, então a consulta simplesmente não encontra nada.
 */
export async function recusarAgendamento(id: string) {
  const extras = await getDocs(query(collection(db, "slots"), where("origemAgendamento", "==", id)));
  const batch = writeBatch(db);
  batch.delete(doc(db, "slots", id));
  batch.delete(doc(db, "agendamentos", id));
  extras.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// ---------- Push (token do aparelho da dona) ----------
// O id do doc é o próprio token (evita duplicar); a API na Vercel lê essa
// coleção para disparar o push. Só a dona (isDono) escreve — ver regras.
export const salvarPushToken = (token: string) =>
  setDoc(doc(db, "pushTokens", token), { criadoEm: serverTimestamp() }, { merge: true });
