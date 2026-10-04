// Horários de um dia: a tabela da dona junto com o que já está ocupado ou bloqueado.
import type { Agendamento } from "./db";
import { passouDoHorario, somarDias } from "./datas";

export type HorarioDia = {
  hora: string; // "HH:MM"
  ocupado: boolean; // tem cliente OU está bloqueado (nos dois casos não dá para escolher)
  nome?: string; // cliente que já está nesse horário (quando se sabe)
  bloqueado?: boolean; // a dona fechou este horário (sem cliente)
};

/**
 * Lista os horários de um dia para a dona escolher: os da tabela dela (`grade`) mais
 * qualquer horário que já tenha cliente ou esteja bloqueado, mesmo fora da tabela (ex.:
 * uma exceção que ela abriu antes). Em ordem, com o que está ocupado marcado e o nome de
 * quem está nele.
 *
 * - `ocupados`: ids "data_hora" da coleção pública `slots` (pedidos, confirmados e bloqueios).
 * - `agendamentos`: a lista da dona (com nome), usada só para dizer QUEM está em cada horário.
 * - `bloqueados`: ids "data_hora" que a dona bloqueou (para não confundir com cliente).
 */
export function horariosDoDia(
  dataKey: string,
  grade: string[],
  ocupados: Set<string>,
  agendamentos: Pick<Agendamento, "data" | "hora" | "clienteNome">[],
  bloqueados: Set<string> = new Set(),
): HorarioDia[] {
  const nomes = new Map<string, string>();
  for (const a of agendamentos) if (a.data === dataKey) nomes.set(a.hora, a.clienteNome);

  const horas = new Set<string>(grade);
  for (const hora of nomes.keys()) horas.add(hora);
  const prefixo = `${dataKey}_`;
  for (const id of ocupados) if (id.startsWith(prefixo)) horas.add(id.slice(prefixo.length));
  for (const id of bloqueados) if (id.startsWith(prefixo)) horas.add(id.slice(prefixo.length));

  return [...horas].sort().map((hora) => {
    const nome = nomes.get(hora);
    const id = `${prefixo}${hora}`;
    const bloqueado = nome === undefined && bloqueados.has(id);
    return {
      hora,
      ocupado: nome !== undefined || ocupados.has(id) || bloqueado,
      nome,
      ...(bloqueado ? { bloqueado: true } : {}),
    };
  });
}

// ---------- Bloqueio de horários (folha "Bloquear horários") ----------
export type Periodo = "manha" | "tarde" | "noite";
export type AtalhoBloqueio = Periodo | "dia";

/** Manhã antes das 12:00; tarde das 12:00 às 17:59; noite a partir das 18:00. */
export function periodoDaHora(hora: string): Periodo {
  return hora < "12:00" ? "manha" : hora < "18:00" ? "tarde" : "noite";
}

/**
 * Seleção resultante de tocar num atalho (Manhã, Tarde, Noite, Dia todo). `livres` são
 * os horários que podem ser escolhidos (sem cliente). O atalho só MARCA os horários
 * (quem decide é a dona ao salvar); tocar de novo com tudo marcado desmarca.
 */
export function selecaoDoAtalho(livres: string[], selecao: Set<string>, atalho: AtalhoBloqueio): Set<string> {
  const alvo = atalho === "dia" ? livres : livres.filter((h) => periodoDaHora(h) === atalho);
  const todos = alvo.length > 0 && alvo.every((h) => selecao.has(h));
  const nova = new Set(selecao);
  for (const h of alvo) {
    if (todos) nova.delete(h);
    else nova.add(h);
  }
  return nova;
}

export type MudancaBloqueio = { bloquear: string[]; liberar: string[] };

/** O que vai mudar ao salvar: marcados que ainda não estavam bloqueados, e o inverso. */
export function diferencaBloqueio(antes: Set<string>, selecao: Set<string>): MudancaBloqueio {
  return {
    bloquear: [...selecao].filter((h) => !antes.has(h)).sort(),
    liberar: [...antes].filter((h) => !selecao.has(h)).sort(),
  };
}

const horarios = (n: number) => `${n} ${n === 1 ? "horário" : "horários"}`;

/** Texto do botão principal da folha. `vazio` = nada a fazer ainda (o botão fica apagado). */
export function rotuloBloqueio(m: MudancaBloqueio, diaTodo: boolean): { texto: string; vazio: boolean } {
  if (diaTodo) return { texto: "Marcar folga", vazio: false };
  if (m.bloquear.length && !m.liberar.length) return { texto: `Bloquear ${horarios(m.bloquear.length)}`, vazio: false };
  if (m.liberar.length && !m.bloquear.length) return { texto: `Liberar ${horarios(m.liberar.length)}`, vazio: false };
  if (m.bloquear.length) return { texto: "Salvar alterações", vazio: false };
  return { texto: "Bloquear horários", vazio: true };
}

/** Frase do aviso que aparece depois de salvar (com "Desfazer"). */
export function mensagemDaMudanca(m: MudancaBloqueio): string {
  const n = m.bloquear.length;
  const l = m.liberar.length;
  if (n && !l) return `${horarios(n)} ${n === 1 ? "bloqueado" : "bloqueados"}.`;
  if (l && !n) return `${horarios(l)} ${l === 1 ? "liberado" : "liberados"}.`;
  return "Alterações salvas.";
}

/** Clientes (confirmadas e pedidos) marcadas num dia, em ordem de horário. */
export function clientesNoDia<T extends { data: string; hora: string }>(dataKey: string, agendamentos: T[]): T[] {
  return agendamentos.filter((a) => a.data === dataKey).sort((x, y) => x.hora.localeCompare(y.hora));
}

// ---------- Duração dos serviços (bloqueia sozinho o horário seguinte) ----------

/** Minutos desde 00:00 de um horário "HH:MM" (uso interno, só para comparar duração). */
function minutosDoDia(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** Soma a duração dos serviços escolhidos (em minutos). Serviço sem duração cadastrada conta como 0. */
export function duracaoTotal(servicos: { duracaoMin?: number }[]): number {
  return servicos.reduce((soma, s) => soma + (s.duracaoMin ?? 0), 0);
}

/**
 * Horários da tabela (`grade`) que a duração do serviço "come" quando ele é marcado às
 * `hora`: os que começam DEPOIS de `hora` e ANTES do serviço terminar. Um serviço que
 * termina bem na hora do horário seguinte não bloqueia nada — só o que passa da hora.
 * Sem duração (0 ou menos), não afeta nenhum horário.
 */
export function horariosAfetados(hora: string, duracaoMin: number, grade: string[]): string[] {
  if (duracaoMin <= 0) return [];
  const inicio = minutosDoDia(hora);
  const fim = inicio + duracaoMin;
  // "> inicio" já deixa a própria `hora` de fora sozinho (ela tem minutosDoDia(h) === inicio).
  return grade.filter((h) => minutosDoDia(h) > inicio && minutosDoDia(h) < fim).sort();
}

/**
 * Dá pra marcar `hora` com essa duração sem esbarrar num horário da tabela que já tem
 * cliente ou já está bloqueado? `ocupados` são os ids "data_hora" já ocupados naquele dia
 * (a própria `hora` é checada à parte, por quem chama).
 */
export function duracaoCabe(
  dataKey: string,
  hora: string,
  duracaoMin: number,
  grade: string[],
  ocupados: Set<string>,
): boolean {
  return horariosAfetados(hora, duracaoMin, grade).every((h) => !ocupados.has(`${dataKey}_${h}`));
}

// ---------- Agenda por dia (painel novo) ----------

/** Estado de uma linha da Agenda — nunca depende só de cor (ver ItemAgenda.agendamento/hora). */
export type EstadoHorario = "confirmado" | "pedido" | "bloqueado" | "livre";

export type ItemAgenda = {
  hora: string;
  estado: EstadoHorario;
  passou: boolean; // esse horário (ou o dia inteiro) já ficou no passado
  agendamento?: Agendamento; // presente em "confirmado" e "pedido"
};

/**
 * Os horários de um dia, já com o estado de cada um, para a tela Agenda: a tabela da
 * dona (`grade`) mais qualquer horário ocupado/bloqueado fora dela (mesma regra de
 * `horariosDoDia`). Confirmado e pedido vêm de `agendamentos`; sem um agendamento
 * correspondente, um slot ocupado (ex.: escrita numa corrida rara) aparece como
 * "confirmado" sem `agendamento" — quem lê trata a ausência de nome à parte.
 */
export function itensDoDia(
  dataKey: string,
  grade: string[],
  ocupados: Set<string>,
  bloqueados: Set<string>,
  agendamentos: Agendamento[],
  agora: Date = new Date(),
): ItemAgenda[] {
  const porHora = new Map<string, Agendamento>();
  for (const a of agendamentos) if (a.data === dataKey) porHora.set(a.hora, a);

  const horas = new Set<string>(grade);
  const prefixo = `${dataKey}_`;
  for (const id of ocupados) if (id.startsWith(prefixo)) horas.add(id.slice(prefixo.length));
  for (const id of bloqueados) if (id.startsWith(prefixo)) horas.add(id.slice(prefixo.length));
  for (const hora of porHora.keys()) horas.add(hora);

  return [...horas].sort().map((hora): ItemAgenda => {
    const passou = passouDoHorario(dataKey, hora, agora);
    const ag = porHora.get(hora);
    if (ag) return { hora, estado: ag.status === "confirmado" ? "confirmado" : "pedido", passou, agendamento: ag };
    const id = `${prefixo}${hora}`;
    if (bloqueados.has(id)) return { hora, estado: "bloqueado", passou };
    if (ocupados.has(id)) return { hora, estado: "confirmado", passou }; // ocupado sem registro (raro)
    return { hora, estado: "livre", passou };
  });
}

/** Quantos pedidos (status "pendente") existem num dia. */
export function pedidosNoDia(dataKey: string, agendamentos: Pick<Agendamento, "data" | "status">[]): number {
  return agendamentos.filter((a) => a.data === dataKey && a.status === "pendente").length;
}

/**
 * A mesma data da semana, repetida (ex.: "todas as sextas"): `dataInicial` mais `semanas - 1`
 * saltos de 7 em 7 dias. `semanas` de 1 devolve só `[dataInicial]`.
 */
export function datasRepetidas(dataInicial: string, semanas: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < semanas; i++) out.push(somarDias(dataInicial, i * 7));
  return out;
}
