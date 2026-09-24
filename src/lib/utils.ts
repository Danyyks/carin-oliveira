// Helpers do "motor" — formatação, WhatsApp e datas.

export const brl = (v: number) => "R$ " + String(v).replace(".", ",");

export function wppUrl(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type Dia = { key: string; dia: string; num: number; mes: string; weekday: number; label: string };

/** Próximos `qtd` dias a partir de amanhã. `key` é a data local (YYYY-MM-DD). */
export function proximosDias(qtd = 6): Dia[] {
  const out: Dia[] = [];
  for (let i = 1; i <= qtd; i++) {
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

/** Rótulo curto de uma data "YYYY-MM-DD" no mesmo formato dos dias (ex.: "sáb, 18/09"). */
export function labelData(dataKey: string): string {
  const [y, m, d] = dataKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS[dt.getDay()]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}
