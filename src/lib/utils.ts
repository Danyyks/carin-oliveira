// Helpers do "motor" — formatação, WhatsApp e datas.

// Valor inteiro fica sem centavos ("R$ 85"); com centavos, sempre duas casas ("R$ 65,50").
export const brl = (v: number) => "R$ " + (Number.isInteger(v) ? String(v) : v.toFixed(2)).replace(".", ",");

export function wppUrl(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/** Duração em minutos → texto curto ("45min", "1h", "1h30"). Zero ou negativo vira "". */
export function formatarDuracao(min: number): string {
  if (!min || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Normaliza o WhatsApp do cliente para o formato do wa.me: só dígitos, com DDI 55.
 * Um número nacional tem no máximo 11 dígitos (DDD + número); só acima disso o "55"
 * inicial é o DDI. Assim, cliente do DDD 55 (RS) digitado sem DDI não é confundido.
 */
export function zap(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d.startsWith("55") && d.length > 11 ? d : "55" + d;
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type Dia = { key: string; dia: string; num: number; mes: string; weekday: number; label: string };

/** Próximos `qtd` dias a partir de amanhã (ou de hoje, com `desdeHoje`). `key` é a data local (YYYY-MM-DD). */
export function proximosDias(qtd = 6, desdeHoje = false): Dia[] {
  const out: Dia[] = [];
  const inicio = desdeHoje ? 0 : 1;
  for (let i = inicio; i < inicio + qtd; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({
      key,
      dia: DIAS[d.getDay()],
      num: d.getDate(),
      mes: MESES[d.getMonth()],
      weekday: d.getDay(),
      label: `${DIAS[d.getDay()]}, ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return out;
}

/** Data de hoje no formato local "YYYY-MM-DD" (mesma base de proximosDias/labelData). */
export function hojeKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Dia da semana (0 = domingo ... 6 = sábado) de uma data "YYYY-MM-DD", no fuso local. */
export function diaDaSemana(dataKey: string): number {
  const [y, m, d] = dataKey.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Rótulo curto de uma data "YYYY-MM-DD", igual ao de `proximosDias` (ex.: "sáb, 3/10"). */
export function labelData(dataKey: string): string {
  const [y, m, d] = dataKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS[dt.getDay()]}, ${d}/${String(m).padStart(2, "0")}`;
}

const MESES_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2027-01-05" → "5 de janeiro". */
export function dataPorExtenso(dataKey: string): string {
  const [, m, d] = dataKey.split("-").map(Number);
  return `${d} de ${MESES_EXTENSO[m - 1]}`;
}
