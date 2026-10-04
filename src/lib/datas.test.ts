import { describe, it, expect } from "vitest";
import { agoraNoSalao, hojeKeySalao, agoraHoraSalao, passouDoHorario, semanaDe, somarDias, gradeDoMes } from "./datas";

describe("agoraNoSalao / hojeKeySalao / agoraHoraSalao", () => {
  // 2030-05-08T01:30:00Z = 07/05 22:30 em São Paulo (UTC-3, sem horário de verão).
  const instante = new Date("2030-05-08T01:30:00Z");

  it("converte para o fuso do salão independente do TZ do processo", () => {
    expect(hojeKeySalao(instante)).toBe("2030-05-07");
    expect(agoraHoraSalao(instante)).toBe("22:30");
  });

  it("agoraNoSalao devolve um Date com os campos locais certos", () => {
    const d = agoraNoSalao(instante);
    expect(d.getFullYear()).toBe(2030);
    expect(d.getMonth()).toBe(4); // maio (0-index)
    expect(d.getDate()).toBe(7);
    expect(d.getHours()).toBe(22);
    expect(d.getMinutes()).toBe(30);
  });

  it("meia-noite exata no fuso do salão não vira 24:MM", () => {
    // 2030-05-08T03:00:00Z = 2030-05-08T00:00:00-03:00
    expect(agoraHoraSalao(new Date("2030-05-08T03:00:00Z"))).toBe("00:00");
    expect(hojeKeySalao(new Date("2030-05-08T03:00:00Z"))).toBe("2030-05-08");
  });
});

describe("passouDoHorario", () => {
  const agora = new Date("2030-05-08T01:30:00Z"); // 07/05 22:30 em São Paulo

  it("dia anterior a hoje: sempre passou", () => {
    expect(passouDoHorario("2030-05-06", "10:00", agora)).toBe(true);
  });
  it("dia posterior a hoje: nunca passou", () => {
    expect(passouDoHorario("2030-05-08", "00:00", agora)).toBe(false);
  });
  it("hoje, horário antes de agora: passou", () => {
    expect(passouDoHorario("2030-05-07", "20:00", agora)).toBe(true);
  });
  it("hoje, horário depois de agora: não passou", () => {
    expect(passouDoHorario("2030-05-07", "23:00", agora)).toBe(false);
  });
});

describe("semanaDe", () => {
  it("sempre começa na segunda e termina no domingo", () => {
    // 2026-09-30 é quarta-feira.
    const semana = semanaDe("2026-09-30");
    expect(semana).toHaveLength(7);
    expect(semana[0]).toEqual({ key: "2026-09-28", dia: "seg", num: 28 });
    expect(semana[6]).toEqual({ key: "2026-10-04", dia: "dom", num: 4 });
  });

  it("uma data que já é domingo devolve a semana que termina nela mesma", () => {
    // 2026-10-04 é domingo.
    const semana = semanaDe("2026-10-04");
    expect(semana[0].key).toBe("2026-09-28");
    expect(semana[6].key).toBe("2026-10-04");
  });

  it("uma data que já é segunda devolve a semana que começa nela mesma", () => {
    const semana = semanaDe("2026-09-28");
    expect(semana[0].key).toBe("2026-09-28");
  });
});

describe("somarDias", () => {
  it("soma dias virando o mês", () => {
    expect(somarDias("2026-09-28", 5)).toBe("2026-10-03");
  });
  it("subtrai dias virando o mês para trás", () => {
    expect(somarDias("2026-10-03", -5)).toBe("2026-09-28");
  });
  it("soma zero devolve a mesma data", () => {
    expect(somarDias("2026-09-28", 0)).toBe("2026-09-28");
  });
});

describe("gradeDoMes", () => {
  it("preenche células vazias antes do dia 1 e lista os dias do mês", () => {
    // setembro/2026: dia 1 é terça (weekday 2) — 2 células vazias antes, 30 dias.
    const grade = gradeDoMes(2026, 8); // mês 0-index: 8 = setembro
    expect(grade.slice(0, 2)).toEqual([null, null]);
    expect(grade.filter((d) => d !== null)).toHaveLength(30);
    expect(grade[grade.length - 1]).toBe(30);
  });
});
