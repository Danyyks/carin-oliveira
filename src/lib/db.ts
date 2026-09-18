// Camada de dados (Firestore) — serviços e disponibilidade.
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ---------- Serviços ----------
export type ServicoDoc = {
  id: string;
  nome: string;
  desc: string;
  preco: number;
  destaque: boolean; // "Mais pedido": ganha selo e aparece no topo da lista
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

/** Escuta os serviços em tempo real (destacados primeiro, depois alfabética). */
export function ouvirServicos(cb: (servicos: ServicoDoc[]) => void) {
  return onSnapshot(
    collection(db, "servicos"),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ServicoDoc, "id">) }));
      cb(ordenarServicos(list));
    },
    (e) => console.error("ouvirServicos:", e),
  );
}
export const addServico = (data: ServicoInput) => addDoc(collection(db, "servicos"), data);
export const updateServico = (id: string, data: Partial<ServicoInput>) =>
  updateDoc(doc(db, "servicos", id), data);
export const removeServico = (id: string) => deleteDoc(doc(db, "servicos", id));

// ---------- Disponibilidade (dias/horários + folgas) ----------
// dias: chave = dia da semana ("0"=domingo ... "6"=sábado), valor = horários "HH:MM".
// bloqueios: datas específicas de folga ("YYYY-MM-DD") em que a dona não atende.
export type Agenda = { dias: Record<string, string[]>; bloqueios?: string[] };

const regrasRef = () => doc(db, "disponibilidade", "regras");

export function ouvirAgenda(cb: (agenda: Agenda) => void) {
  return onSnapshot(
    regrasRef(),
    (d) => cb((d.data() as Agenda) ?? { dias: {} }),
    (e) => console.error("ouvirAgenda:", e),
  );
}
// Salva só os dias/horários, preservando as folgas (merge não apaga `bloqueios`).
export const salvarAgenda = (agenda: Agenda) =>
  setDoc(regrasRef(), { dias: agenda.dias }, { merge: true });

// Salva só as folgas (datas), preservando os dias/horários.
export const salvarBloqueios = (datas: string[]) =>
  setDoc(regrasRef(), { bloqueios: datas }, { merge: true });

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

/**
 * Horários já ocupados (coleção pública `slots`, só data/hora/status — sem
 * dados do cliente). Usado no site para esconder horários indisponíveis.
 */
export function ouvirSlotsOcupados(cb: (ocupados: Set<string>) => void) {
  return onSnapshot(
    collection(db, "slots"),
    (snap) => cb(new Set(snap.docs.map((d) => d.id))),
    (e) => console.error("ouvirSlotsOcupados:", e),
  );
}

/**
 * Cria o pedido: grava o slot público + o agendamento privado de forma atômica.
 * Se o horário já existir, o `set` vira um `update` no doc existente — e a regra
 * `update` (só a dona) barra o batch inteiro. É o que impede dois clientes
 * pegarem o mesmo horário (o id determinístico "data_hora" garante a colisão).
 */
export async function criarAgendamento(a: NovoAgendamento) {
  const id = `${a.data}_${a.hora}`;
  const batch = writeBatch(db);
  batch.set(doc(db, "slots", id), {
    data: a.data,
    hora: a.hora,
    status: "pendente",
    criadoEm: serverTimestamp(),
  });
  batch.set(doc(db, "agendamentos", id), {
    ...a,
    status: "pendente",
    criadoEm: serverTimestamp(),
  });
  await batch.commit();
  return id;
}

/**
 * A dona registra um agendamento da agenda MANUAL dela (cliente que marcou por
 * fora). Entra já `confirmado` e trava o horário no site. Só a dona faz isso
 * (as regras liberam create para isDono).
 */
export async function criarAgendamentoManual(a: NovoAgendamento) {
  const id = `${a.data}_${a.hora}`;
  const batch = writeBatch(db);
  batch.set(doc(db, "slots", id), {
    data: a.data,
    hora: a.hora,
    status: "confirmado",
    criadoEm: serverTimestamp(),
  });
  batch.set(doc(db, "agendamentos", id), {
    ...a,
    status: "confirmado",
    criadoEm: serverTimestamp(),
  });
  await batch.commit();
  return id;
}

/** Escuta os agendamentos (só a dona lê) em tempo real, ordenados por data/hora. */
export function ouvirAgendamentos(cb: (ags: Agendamento[]) => void) {
  return onSnapshot(
    collection(db, "agendamentos"),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Agendamento, "id">) }));
      list.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
      cb(list);
    },
    (e) => console.error("ouvirAgendamentos:", e),
  );
}

/** Confirma o agendamento (slot + registro viram "confirmado"). */
export async function confirmarAgendamento(id: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, "slots", id), { status: "confirmado" });
  batch.update(doc(db, "agendamentos", id), { status: "confirmado" });
  await batch.commit();
}

/** Recusa/cancela: apaga o slot e o registro, liberando o horário. */
export async function recusarAgendamento(id: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "slots", id));
  batch.delete(doc(db, "agendamentos", id));
  await batch.commit();
}

// ---------- Push (token do aparelho da dona) ----------
// O id do doc é o próprio token (evita duplicar); a API na Vercel lê essa
// coleção para disparar o push. Só a dona (isDono) escreve — ver regras.
export const salvarPushToken = (token: string) =>
  setDoc(doc(db, "pushTokens", token), { criadoEm: serverTimestamp() }, { merge: true });
