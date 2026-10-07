"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  ouvirServicos,
  ouvirAgenda,
  ouvirSlots,
  ouvirAgendamentos,
  type ServicoDoc,
  type Agenda,
  type SlotDoc,
  type Agendamento,
} from "@/lib/db";
import { hojeKeySalao, somarDias } from "@/lib/datas";

// Janela de leitura de `slots`: 120 dias pra frente cobrem a maior antecedência que o site
// pode abrir (3 meses, ver ANTECEDENCIAS em db.ts) com folga, e 7 pra trás cobrem "hoje"
// com folga de fuso. Se um dia o site abrir mais que isso, esta janela tem que crescer junto
// — senão um horário já marcado lá na frente apareceria "Livre" na Agenda.
const DIAS_ANTES = 7;
const DIAS_DEPOIS = 120;

export type Dados = {
  servicos: ServicoDoc[];
  agenda: Agenda;
  slots: SlotDoc[];
  // Todos os agendamentos pendentes (qualquer data) + confirmados dentro da janela —
  // a mesma lista que a Agenda e a aba Pedidos usam, sem duas assinaturas separadas.
  agendamentos: Agendamento[];
  carregando: boolean;
  erros: { servicos: boolean; agenda: boolean; slots: boolean; agendamentos: boolean };
};

// Exportado só para o preview de desenvolvimento (dados fictícios sem precisar logar) —
// o app de verdade nunca usa isso diretamente, sempre via <DadosProvider>/useDados().
export const DadosContext = createContext<Dados | null>(null);

/** Só dentro de `<DadosProvider>` (o shell do painel novo monta um por sessão). */
export function useDados(): Dados {
  const ctx = useContext(DadosContext);
  if (!ctx) throw new Error("useDados precisa estar dentro de <DadosProvider>");
  return ctx;
}

/**
 * Uma assinatura por fonte para todo o painel novo (Agenda, Pedidos, Horários, Serviços):
 * evita 4-5 componentes lendo a mesma coisa em paralelo. Erro numa fonte não derruba as
 * outras — cada uma degrada sozinha (a tela mostra o que tem e avisa o que faltou).
 */
export default function DadosProvider({ children }: { children: ReactNode }) {
  const [servicos, setServicos] = useState<ServicoDoc[] | null>(null);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [slots, setSlots] = useState<SlotDoc[] | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[] | null>(null);
  const [erros, setErros] = useState<Dados["erros"]>({ servicos: false, agenda: false, slots: false, agendamentos: false });
  // Só mostra esqueleto de carregamento depois de 250ms: numa conexão boa, os dados já
  // chegaram antes disso e a tela nunca pisca "carregando" à toa.
  const [podeMostrarEsqueleto, setPodeMostrarEsqueleto] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPodeMostrarEsqueleto(true), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => ouvirServicos(setServicos, () => setErros((e) => ({ ...e, servicos: true }))), []);
  useEffect(() => ouvirAgenda(setAgenda, () => setErros((e) => ({ ...e, agenda: true }))), []);
  useEffect(() => {
    const desde = somarDias(hojeKeySalao(), -DIAS_ANTES);
    const ate = somarDias(hojeKeySalao(), DIAS_DEPOIS);
    return ouvirSlots(setSlots, { desde, ate }, () => setErros((e) => ({ ...e, slots: true })));
  }, []);
  useEffect(() => ouvirAgendamentos(setAgendamentos, () => setErros((e) => ({ ...e, agendamentos: true }))), []);

  const tudoChegou = servicos !== null && agenda !== null && slots !== null && agendamentos !== null;
  const valor: Dados = {
    servicos: servicos ?? [],
    agenda: agenda ?? { dias: {}, bloqueios: [] },
    slots: slots ?? [],
    agendamentos: agendamentos ?? [],
    carregando: !tudoChegou && podeMostrarEsqueleto,
    erros,
  };

  return <DadosContext.Provider value={valor}>{children}</DadosContext.Provider>;
}
