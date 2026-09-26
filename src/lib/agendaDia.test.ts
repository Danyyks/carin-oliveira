// Testes dos horários de um dia no agendamento manual (livres, ocupados e exceções).
import { describe, it, expect } from "vitest";
import { horariosDoDia } from "./agendaDia";

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
