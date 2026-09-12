// Helpers do "motor" — formatação, WhatsApp e datas.

export const brl = (v: number) => "R$ " + String(v).replace(".", ",");

export function wppUrl(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type Dia = { key: string; dia: string; num: number; mes: string; label: string };

/** Próximos `qtd` dias a partir de amanhã (provisório; a disponibilidade real vem do painel na Etapa 4/5). */
export function proximosDias(qtd = 6): Dia[] {
  const out: Dia[] = [];
  for (let i = 1; i <= qtd; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({
      key: d.toISOString().slice(0, 10),
      dia: DIAS[d.getDay()],
      num: d.getDate(),
      mes: MESES[d.getMonth()],
      label: `${DIAS[d.getDay()]}, ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return out;
}
