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
export type TipoServico = "servico" | "combo" | "promocao";

export type ServicoDoc = {
  id: string;
  nome: string;
  desc: string;
  preco: number;
  tipo: TipoServico;
  ordem: number;
};
export type ServicoInput = Omit<ServicoDoc, "id">;

/** Escuta os serviços em tempo real (ordenados por `ordem`). */
export function ouvirServicos(cb: (servicos: ServicoDoc[]) => void) {
  return onSnapshot(collection(db, "servicos"), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ServicoDoc, "id">) }));
    list.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    cb(list);
  });
}
export const addServico = (data: ServicoInput) => addDoc(collection(db, "servicos"), data);
export const updateServico = (id: string, data: Partial<ServicoInput>) =>
  updateDoc(doc(db, "servicos", id), data);
export const removeServico = (id: string) => deleteDoc(doc(db, "servicos", id));

// ---------- Disponibilidade (dias/horários) ----------
// dias: chave = dia da semana ("0"=domingo ... "6"=sábado), valor = horários "HH:MM".
export type Agenda = { dias: Record<string, string[]> };

export function ouvirAgenda(cb: (agenda: Agenda) => void) {
  return onSnapshot(doc(db, "disponibilidade", "regras"), (d) => {
    cb((d.data() as Agenda) ?? { dias: {} });
  });
}
export const salvarAgenda = (agenda: Agenda) =>
  setDoc(doc(db, "disponibilidade", "regras"), agenda);

// ---------- Agendamentos ----------
export type Agendamento = {
  id: string; // = `${data}_${hora}` (id determinístico = trava anti-duplicidade)
  servicoNome: string;
  servicoPreco: number;
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
  return onSnapshot(collection(db, "slots"), (snap) => {
    cb(new Set(snap.docs.map((d) => d.id)));
  });
}

/**
 * Cria o pedido: grava o slot público + o agendamento privado de forma atômica.
 * Se o slot já existir, a regra (create-only) faz o batch inteiro falhar — é o
 * que impede dois clientes pegarem o mesmo horário.
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

/** Escuta os agendamentos (só a dona lê) em tempo real, ordenados por data/hora. */
export function ouvirAgendamentos(cb: (ags: Agendamento[]) => void) {
  return onSnapshot(collection(db, "agendamentos"), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Agendamento, "id">) }));
    list.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    cb(list);
  });
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
