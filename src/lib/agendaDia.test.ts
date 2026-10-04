// Testes dos horários de um dia no agendamento manual (livres, ocupados e exceções).
import { describe, it, expect } from "vitest";
import {
  horariosDoDia,
  periodoDaHora,
  selecaoDoAtalho,
  diferencaBloqueio,
  rotuloBloqueio,
  mensagemDaMudanca,
  clientesNoDia,
  duracaoTotal,
  horariosAfetados,
  duracaoCabe,
  itensDoDia,
  pedidosNoDia,
  datasRepetidas,
} from "./agendaDia";
import type { Agendamento } from "./db";

const DIA = "2030-05-07";
const grade = ["09:00", "10:00", "14:00"];
const ag = (hora: string, clienteNome: string, data = DIA) => ({ data, hora, clienteNome });

describe("horariosDoDia", () => {
  it("sem ninguém agendado, todos os horários da tabela ficam livres", () => {
    expect(horariosDoDia(DIA, grade, new Set(), [])).toEqual([
      { hora: "09:00", ocupado: false },
      { hora: "10:00", ocupado: false },
      { hora: "14:00", ocupado: false },
    ]);
  });

  it("marca como ocupado o horário que já tem cliente e traz o nome dela", () => {
    const r = horariosDoDia(DIA, grade, new Set([`${DIA}_10:00`]), [ag("10:00", "Bruna Lima")]);
    expect(r.find((h) => h.hora === "10:00")).toEqual({ hora: "10:00", ocupado: true, nome: "Bruna Lima" });
    expect(r.filter((h) => h.ocupado)).toHaveLength(1);
  });

  it("mostra também o horário ocupado que está FORA da tabela, na ordem certa", () => {
    const ocupados = new Set([`${DIA}_08:00`, `${DIA}_19:30`]);
    const r = horariosDoDia(DIA, grade, ocupados, [ag("19:30", "Carla"), ag("08:00", "Dani")]);
    expect(r.map((h) => h.hora)).toEqual(["08:00", "09:00", "10:00", "14:00", "19:30"]);
    expect(r[0]).toMatchObject({ hora: "08:00", ocupado: true, nome: "Dani" });
    expect(r[4]).toMatchObject({ hora: "19:30", ocupado: true, nome: "Carla" });
  });

  it("horário travado na agenda pública, sem o nome na lista, continua ocupado", () => {
    const r = horariosDoDia(DIA, grade, new Set([`${DIA}_14:00`]), []);
    expect(r.find((h) => h.hora === "14:00")).toEqual({ hora: "14:00", ocupado: true });
  });

  it("agendamento da lista, mesmo sem o slot correspondente, conta como ocupado", () => {
    const r = horariosDoDia(DIA, grade, new Set(), [ag("09:00", "Ana")]);
    expect(r.find((h) => h.hora === "09:00")).toMatchObject({ ocupado: true, nome: "Ana" });
  });

  it("ignora agendamentos e horários travados de outros dias", () => {
    const outro = "2030-05-08";
    const r = horariosDoDia(DIA, grade, new Set([`${outro}_10:00`, `${outro}_18:00`]), [ag("10:00", "Bruna", outro)]);
    expect(r.every((h) => !h.ocupado)).toBe(true);
    expect(r.map((h) => h.hora)).toEqual(grade);
  });

  it("não repete um horário que está na tabela e também ocupado", () => {
    const r = horariosDoDia(DIA, grade, new Set([`${DIA}_10:00`]), [ag("10:00", "Bruna")]);
    expect(r.filter((h) => h.hora === "10:00")).toHaveLength(1);
  });

  it("ordena os horários mesmo que a tabela venha fora de ordem", () => {
    const r = horariosDoDia(DIA, ["14:00", "09:00", "10:30"], new Set(), []);
    expect(r.map((h) => h.hora)).toEqual(["09:00", "10:30", "14:00"]);
  });

  it("dia sem atendimento na tabela e sem ninguém agendado devolve lista vazia", () => {
    expect(horariosDoDia(DIA, [], new Set(), [])).toEqual([]);
  });
});

describe("horariosDoDia com bloqueios", () => {
  const id = (hora: string, dia = DIA) => `${dia}_${hora}`;

  it("horário bloqueado sem cliente sai ocupado e marcado como bloqueado", () => {
    const bloq = new Set([id("10:00")]);
    const r = horariosDoDia(DIA, grade, bloq, [], bloq);
    expect(r.find((h) => h.hora === "10:00")).toEqual({ hora: "10:00", ocupado: true, bloqueado: true });
    expect(r.filter((h) => h.ocupado)).toHaveLength(1);
  });

  it("bloqueio fora da tabela também aparece, na ordem certa", () => {
    const bloq = new Set([id("08:00"), id("19:00")]);
    const r = horariosDoDia(DIA, grade, bloq, [], bloq);
    expect(r.map((h) => h.hora)).toEqual(["08:00", "09:00", "10:00", "14:00", "19:00"]);
    expect(r[0]).toMatchObject({ ocupado: true, bloqueado: true });
  });

  it("horário com cliente nunca é tratado como bloqueado", () => {
    const ocupados = new Set([id("10:00")]);
    const r = horariosDoDia(DIA, grade, ocupados, [ag("10:00", "Bruna Lima")], new Set([id("10:00")]));
    const h = r.find((x) => x.hora === "10:00");
    expect(h).toEqual({ hora: "10:00", ocupado: true, nome: "Bruna Lima" });
    expect(h?.bloqueado).toBeUndefined();
  });

  it("bloqueio de outro dia não interfere (nem traz horário fora da tabela)", () => {
    // 10:00 está na tabela; 19:30 não: se o bloqueio do outro dia vazasse, 19:30 apareceria aqui.
    const bloq = new Set([id("10:00", "2030-05-08"), id("19:30", "2030-05-08")]);
    const r = horariosDoDia(DIA, grade, bloq, [], bloq);
    expect(r.every((h) => !h.ocupado)).toBe(true);
    expect(r.map((h) => h.hora)).toEqual(grade);
  });
});

describe("periodoDaHora", () => {
  it("manhã antes do meio-dia, tarde até 17:59, noite a partir das 18:00", () => {
    expect(periodoDaHora("06:00")).toBe("manha");
    expect(periodoDaHora("11:59")).toBe("manha");
    expect(periodoDaHora("12:00")).toBe("tarde");
    expect(periodoDaHora("17:59")).toBe("tarde");
    expect(periodoDaHora("18:00")).toBe("noite");
    expect(periodoDaHora("21:30")).toBe("noite");
  });
});

describe("selecaoDoAtalho", () => {
  const livres = ["08:00", "09:30", "12:00", "14:00", "18:00"];

  it("Manhã marca só os horários da manhã", () => {
    expect([...selecaoDoAtalho(livres, new Set(), "manha")]).toEqual(["08:00", "09:30"]);
  });

  it("Tarde não inclui o das 18:00 nem os da manhã (12:00 já é tarde)", () => {
    expect([...selecaoDoAtalho(livres, new Set(), "tarde")]).toEqual(["12:00", "14:00"]);
  });

  it("Noite marca só a partir das 18:00", () => {
    expect([...selecaoDoAtalho(livres, new Set(), "noite")]).toEqual(["18:00"]);
  });

  it("Dia todo marca todos os horários livres", () => {
    expect([...selecaoDoAtalho(livres, new Set(), "dia")]).toEqual(livres);
  });

  it("acrescenta ao que já estava marcado, sem perder a seleção", () => {
    const r = selecaoDoAtalho(livres, new Set(["14:00"]), "manha");
    expect([...r].sort()).toEqual(["08:00", "09:30", "14:00"]);
  });

  it("tocar de novo com o período todo marcado desmarca só aquele período", () => {
    const r = selecaoDoAtalho(livres, new Set(["08:00", "09:30", "14:00"]), "manha");
    expect([...r]).toEqual(["14:00"]);
  });

  it("nunca marca um horário que não está entre os livres (ex.: com cliente)", () => {
    const r = selecaoDoAtalho(["08:00", "14:00"], new Set(), "dia"); // 09:30 tem cliente e ficou de fora
    expect(r.has("09:30")).toBe(false);
  });

  it("período sem horários livres não muda nada", () => {
    const antes = new Set(["14:00"]);
    expect([...selecaoDoAtalho(["14:00"], antes, "manha")]).toEqual(["14:00"]);
  });

  it("não altera a seleção recebida", () => {
    const antes = new Set<string>();
    selecaoDoAtalho(livres, antes, "dia");
    expect(antes.size).toBe(0);
  });
});

describe("diferencaBloqueio", () => {
  it("separa o que vai bloquear do que vai liberar, em ordem", () => {
    const m = diferencaBloqueio(new Set(["09:00", "10:00"]), new Set(["10:00", "14:00", "11:00"]));
    expect(m).toEqual({ bloquear: ["11:00", "14:00"], liberar: ["09:00"] });
  });

  it("sem mudança, nada a fazer", () => {
    expect(diferencaBloqueio(new Set(["09:00"]), new Set(["09:00"]))).toEqual({ bloquear: [], liberar: [] });
  });
});

describe("rotuloBloqueio e mensagemDaMudanca", () => {
  const m = (bloquear: string[], liberar: string[] = []) => ({ bloquear, liberar });

  it("botão vazio antes de marcar qualquer coisa", () => {
    expect(rotuloBloqueio(m([]), false)).toEqual({ texto: "Bloquear horários", vazio: true });
  });

  it("conta os horários, no singular e no plural", () => {
    expect(rotuloBloqueio(m(["09:00"]), false).texto).toBe("Bloquear 1 horário");
    expect(rotuloBloqueio(m(["09:00", "10:00"]), false).texto).toBe("Bloquear 2 horários");
    expect(rotuloBloqueio(m([], ["09:00"]), false).texto).toBe("Liberar 1 horário");
    expect(rotuloBloqueio(m([], ["09:00", "10:00"]), false).texto).toBe("Liberar 2 horários");
  });

  it("bloquear e liberar juntos viram Salvar alterações", () => {
    expect(rotuloBloqueio(m(["09:00"], ["10:00"]), false)).toEqual({ texto: "Salvar alterações", vazio: false });
  });

  it("dia todo vira Marcar folga, mesmo com a lista vazia", () => {
    expect(rotuloBloqueio(m([]), true)).toEqual({ texto: "Marcar folga", vazio: false });
  });

  it("aviso depois de salvar concorda em número e gênero", () => {
    expect(mensagemDaMudanca(m(["09:00"]))).toBe("1 horário bloqueado.");
    expect(mensagemDaMudanca(m(["09:00", "10:00"]))).toBe("2 horários bloqueados.");
    expect(mensagemDaMudanca(m([], ["09:00"]))).toBe("1 horário liberado.");
    expect(mensagemDaMudanca(m([], ["09:00", "10:00"]))).toBe("2 horários liberados.");
    expect(mensagemDaMudanca(m(["09:00"], ["10:00"]))).toBe("Alterações salvas.");
  });
});

describe("clientesNoDia", () => {
  it("devolve só as clientes do dia, em ordem de horário", () => {
    const lista = [ag("14:00", "C"), ag("09:00", "A"), ag("10:00", "B", "2030-05-08")];
    expect(clientesNoDia(DIA, lista).map((x) => x.clienteNome)).toEqual(["A", "C"]);
  });
});

describe("duracaoTotal", () => {
  it("soma a duração dos serviços escolhidos", () => {
    expect(duracaoTotal([{ duracaoMin: 60 }, { duracaoMin: 30 }])).toBe(90);
  });

  it("serviço sem duração cadastrada conta como 0", () => {
    expect(duracaoTotal([{ duracaoMin: 60 }, {}])).toBe(60);
  });

  it("lista vazia dá 0", () => {
    expect(duracaoTotal([])).toBe(0);
  });
});

describe("horariosAfetados", () => {
  const grade = ["09:00", "09:30", "10:00", "11:00", "13:00"];

  it("serviço que termina antes do próximo horário não afeta nada", () => {
    expect(horariosAfetados("09:00", 25, grade)).toEqual([]); // termina 09:25, antes das 09:30
  });

  it("serviço que termina EXATAMENTE na hora do próximo não bloqueia (cabe certinho)", () => {
    expect(horariosAfetados("09:00", 30, grade)).toEqual([]);
  });

  it("serviço mais longo que o intervalo bloqueia o próximo horário", () => {
    expect(horariosAfetados("09:00", 45, grade)).toEqual(["09:30"]);
  });

  it("serviço bem longo bloqueia vários horários seguidos, em ordem", () => {
    expect(horariosAfetados("09:00", 130, grade)).toEqual(["09:30", "10:00", "11:00"]);
  });

  it("nunca inclui a própria hora escolhida", () => {
    expect(horariosAfetados("09:00", 999, grade)).not.toContain("09:00");
  });

  it("não olha pra trás: horário antes da hora escolhida nunca é afetado", () => {
    expect(horariosAfetados("11:00", 600, grade)).not.toContain("09:00");
    expect(horariosAfetados("11:00", 600, grade)).not.toContain("10:00");
  });

  it("sem duração (0 ou negativo), não afeta nada", () => {
    expect(horariosAfetados("09:00", 0, grade)).toEqual([]);
    expect(horariosAfetados("09:00", -30, grade)).toEqual([]);
  });

  it("hora fora da grade (exceção) também soma corretamente os horários da grade que come", () => {
    expect(horariosAfetados("09:15", 60, grade)).toEqual(["09:30", "10:00"]);
  });
});

describe("duracaoCabe", () => {
  const grade = ["09:00", "09:30", "10:00"];
  const DIA = "2030-06-10";

  it("cabe quando o horário afetado está livre", () => {
    expect(duracaoCabe(DIA, "09:00", 45, grade, new Set())).toBe(true);
  });

  it("não cabe quando o horário seguinte, que a duração come, já está ocupado", () => {
    const ocupados = new Set([`${DIA}_09:30`]);
    expect(duracaoCabe(DIA, "09:00", 45, grade, ocupados)).toBe(false);
  });

  it("horário ocupado em outro dia não atrapalha", () => {
    const ocupados = new Set(["2030-06-11_09:30"]);
    expect(duracaoCabe(DIA, "09:00", 45, grade, ocupados)).toBe(true);
  });

  it("sem duração, sempre cabe (mesmo com o próximo ocupado)", () => {
    const ocupados = new Set([`${DIA}_09:30`]);
    expect(duracaoCabe(DIA, "09:00", 0, grade, ocupados)).toBe(true);
  });

  it("o próprio horário ocupado não é o que essa função checa (é responsabilidade de quem chama)", () => {
    const ocupados = new Set([`${DIA}_09:00`]);
    expect(duracaoCabe(DIA, "09:00", 45, grade, ocupados)).toBe(true);
  });
});

describe("itensDoDia", () => {
  const DIA = "2030-05-07";
  const grade = ["09:00", "10:00", "14:00"];
  const agendamento = (hora: string, status: Agendamento["status"], data = DIA): Agendamento => ({
    id: `${data}_${hora}`,
    servicos: [{ nome: "Esmaltação", preco: 50 }],
    total: 50,
    clienteNome: "Bruna",
    clienteWhatsapp: "",
    data,
    hora,
    diaLabel: "ter, 07/05",
    status,
  });
  const agora = new Date("2030-05-07T18:00:00Z"); // 15:00 em São Paulo (UTC-3), fixo p/ qualquer TZ do processo

  it("sem nada marcado, todos os horários da grade ficam livres", () => {
    const r = itensDoDia(DIA, grade, new Set(), new Set(), [], agora);
    expect(r.map((i) => [i.hora, i.estado])).toEqual([
      ["09:00", "livre"],
      ["10:00", "livre"],
      ["14:00", "livre"],
    ]);
  });

  it("agendamento confirmado vira estado confirmado, com o agendamento anexado", () => {
    const ag = agendamento("10:00", "confirmado");
    const r = itensDoDia(DIA, grade, new Set([`${DIA}_10:00`]), new Set(), [ag], agora);
    expect(r.find((i) => i.hora === "10:00")).toMatchObject({ estado: "confirmado", agendamento: ag });
  });

  it("agendamento pendente vira estado pedido", () => {
    const ag = agendamento("10:00", "pendente");
    const r = itensDoDia(DIA, grade, new Set([`${DIA}_10:00`]), new Set(), [ag], agora);
    expect(r.find((i) => i.hora === "10:00")).toMatchObject({ estado: "pedido", agendamento: ag });
  });

  it("horário bloqueado sem cliente vira estado bloqueado", () => {
    const r = itensDoDia(DIA, grade, new Set([`${DIA}_09:00`]), new Set([`${DIA}_09:00`]), [], agora);
    expect(r.find((i) => i.hora === "09:00")).toMatchObject({ estado: "bloqueado" });
  });

  it("ocupado sem agendamento correspondente (raro) vira confirmado sem nome", () => {
    const r = itensDoDia(DIA, grade, new Set([`${DIA}_09:00`]), new Set(), [], agora);
    const item = r.find((i) => i.hora === "09:00");
    expect(item?.estado).toBe("confirmado");
    expect(item?.agendamento).toBeUndefined();
  });

  it("ignora agendamentos e bloqueios de outro dia", () => {
    const outro = "2030-05-08";
    const r = itensDoDia(DIA, grade, new Set([`${outro}_09:00`]), new Set([`${outro}_09:00`]), [agendamento("09:00", "confirmado", outro)], agora);
    expect(r.every((i) => i.estado === "livre")).toBe(true);
  });

  it("marca `passou` pelo horário, não só pelo dia", () => {
    const r = itensDoDia(DIA, grade, new Set(), new Set(), [], agora); // agora = 15:00
    expect(r.find((i) => i.hora === "09:00")?.passou).toBe(true);
    expect(r.find((i) => i.hora === "14:00")?.passou).toBe(true);
  });

  it("dia inteiro no futuro: nada passou, mesmo com hora 'antiga' na grade", () => {
    const r = itensDoDia("2030-05-08", grade, new Set(), new Set(), [], agora);
    expect(r.every((i) => !i.passou)).toBe(true);
  });
});

describe("pedidosNoDia", () => {
  it("conta só os pendentes daquele dia", () => {
    const lista = [
      { data: "2030-05-07", status: "pendente" as const },
      { data: "2030-05-07", status: "confirmado" as const },
      { data: "2030-05-07", status: "pendente" as const },
      { data: "2030-05-08", status: "pendente" as const },
    ];
    expect(pedidosNoDia("2030-05-07", lista)).toBe(2);
  });

  it("sem pedidos naquele dia, devolve 0", () => {
    expect(pedidosNoDia("2030-05-07", [])).toBe(0);
  });
});

describe("datasRepetidas", () => {
  it("repete a mesma data da semana, de 7 em 7 dias", () => {
    expect(datasRepetidas("2030-05-03", 4)).toEqual([
      "2030-05-03",
      "2030-05-10",
      "2030-05-17",
      "2030-05-24",
    ]);
  });

  it("1 semana devolve só a data inicial", () => {
    expect(datasRepetidas("2030-05-03", 1)).toEqual(["2030-05-03"]);
  });

  it("atravessa virada de mês corretamente", () => {
    expect(datasRepetidas("2030-05-29", 2)).toEqual(["2030-05-29", "2030-06-05"]);
  });
});
