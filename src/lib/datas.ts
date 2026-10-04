// Datas do painel novo — sempre no fuso do salão (America/Sao_Paulo), nunca o do
// aparelho/servidor que estiver rodando o código (o site público e o painel clássico
// continuam usando `new Date()` local em utils.ts; aqui é só para a Agenda por dia).
const FUSO = "America/Sao_Paulo";
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type Partes = { year: string; month: string; day: string; hour: string; minute: string; second: string };

function partesEm(data: Date): Partes {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(data).map((x) => [x.type, x.value]));
  // à meia-noite o Intl às vezes devolve "24" na hora — normaliza para "00".
  if (p.hour === "24") p.hour = "00";
  return p as unknown as Partes;
}

/** Agora, mas sempre no fuso do salão — independente do fuso do aparelho/servidor. */
export function agoraNoSalao(base: Date = new Date()): Date {
  const p = partesEm(base);
  return new Date(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
}

/** Data de hoje "YYYY-MM-DD" no fuso do salão. */
export function hojeKeySalao(base: Date = new Date()): string {
  const p = partesEm(base);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hora "HH:MM" agora, no fuso do salão. */
export function agoraHoraSalao(base: Date = new Date()): string {
  const p = partesEm(base);
  return `${p.hour}:${p.minute}`;
}

/** Esse horário de um dia já passou (no fuso do salão)? Dia anterior a hoje: sempre. */
export function passouDoHorario(dataKey: string, hora: string, base: Date = new Date()): boolean {
  const hoje = hojeKeySalao(base);
  if (dataKey < hoje) return true;
  if (dataKey > hoje) return false;
  return hora < agoraHoraSalao(base);
}

export type DiaSemana = { key: string; dia: string; num: number };

/** Os 7 dias (segunda a domingo) da semana que contém `dataKey`. */
export function semanaDe(dataKey: string): DiaSemana[] {
  const [y, m, d] = dataKey.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const dow = base.getDay(); // 0=dom..6=sáb
  const paraSegunda = dow === 0 ? -6 : 1 - dow;
  const seg = new Date(y, m - 1, d + paraSegunda);
  const out: DiaSemana[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i);
    out.push({
      key: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`,
      dia: DIAS[dt.getDay()],
      num: dt.getDate(),
    });
  }
  return out;
}

/** Soma (ou subtrai) dias a uma data "YYYY-MM-DD", sem tocar fuso nenhum (aritmética local). */
export function somarDias(dataKey: string, dias: number): string {
  const [y, m, d] = dataKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d + dias);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Grade de células do mês (para o calendário de navegação), como `CalendarioFolgas` já faz. */
export function gradeDoMes(ano: number, mes: number): (number | null)[] {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let dia = 1; dia <= totalDias; dia++) celulas.push(dia);
  return celulas;
}
