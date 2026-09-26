// Horários de um dia no agendamento manual: junta a tabela da dona com o que já está ocupado.
import type { Agendamento } from "./db";

export type HorarioDia = {
  hora: string; // "HH:MM"
  ocupado: boolean;
  nome?: string; // cliente que já está nesse horário (quando se sabe)
};

/**
 * Lista os horários de um dia para a dona escolher: os da tabela dela (`grade`) mais
 * qualquer horário que já tenha cliente, mesmo fora da tabela (ex.: uma exceção que ela
 * abriu antes). Em ordem, com o que está ocupado marcado e o nome de quem está nele.
 *
 * - `ocupados`: ids "data_hora" da coleção pública `slots` (pedidos pendentes e confirmados).
 * - `agendamentos`: a lista da dona (com nome), usada só para dizer QUEM está em cada horário.
 */
export function horariosDoDia(
  dataKey: string,
  grade: string[],
  ocupados: Set<string>,
  agendamentos: Pick<Agendamento, "data" | "hora" | "clienteNome">[],
): HorarioDia[] {
  const nomes = new Map<string, string>();
  for (const a of agendamentos) if (a.data === dataKey) nomes.set(a.hora, a.clienteNome);

  const horas = new Set<string>(grade);
  for (const hora of nomes.keys()) horas.add(hora);
  const prefixo = `${dataKey}_`;
  for (const id of ocupados) if (id.startsWith(prefixo)) horas.add(id.slice(prefixo.length));

  return [...horas].sort().map((hora) => {
    const nome = nomes.get(hora);
    return { hora, ocupado: nome !== undefined || ocupados.has(`${prefixo}${hora}`), nome };
  });
}
