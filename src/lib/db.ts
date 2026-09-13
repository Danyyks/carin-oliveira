// Camada de dados (Firestore) — serviços e disponibilidade.
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
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
