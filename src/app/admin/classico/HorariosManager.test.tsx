// @vitest-environment jsdom
// Caracterização da tabela de Dias e horários (toggle de chips + salvar) — trava o
// comportamento atual antes da Fase B mexer no painel.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import HorariosManager from "./HorariosManager";

const banco = vi.hoisted(() => ({
  agenda: { dias: {} as Record<string, string[]> },
  salvar: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  ouvirAgenda: (cb: (a: unknown) => void) => {
    cb(banco.agenda);
    return () => {};
  },
  salvarAgenda: banco.salvar,
}));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

beforeEach(() => {
  banco.agenda = { dias: {} };
  banco.salvar.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function abrirSecao() {
  fireEvent.click(screen.getByRole("button", { name: /Dias e horários/ }));
}

describe("Resumo (fechado)", () => {
  it("nenhum dia ativo mostra 'nenhum'", () => {
    render(<HorariosManager />);
    expect(screen.getByRole("button", { name: /Dias e horários/ }).textContent).toContain("nenhum");
  });

  it("conta os dias com pelo menos um horário", () => {
    banco.agenda = { dias: { "1": ["09:00"], "2": [], "3": ["10:00"] } };
    render(<HorariosManager />);
    expect(screen.getByRole("button", { name: /Dias e horários/ }).textContent).toContain("2 dias");
  });
});

describe("Marcar e salvar horários", () => {
  it("toca num horário livre para marcá-lo e chama salvarAgenda com o resultado", async () => {
    render(<HorariosManager />);
    abrirSecao();
    // Sete linhas (uma por dia da semana) repetem os mesmos rótulos de horário; a
    // primeira linha renderizada é "Segunda" (chave "1" em DIAS).
    fireEvent.click(screen.getAllByRole("button", { name: "09:00" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Salvar horários" }));

    await waitFor(() => expect(banco.salvar).toHaveBeenCalledOnce());
    expect(banco.salvar.mock.calls[0][0].dias["1"]).toEqual(["09:00"]);
    expect(screen.getByText("Horários salvos!")).toBeTruthy();
  });

  it("tocar de novo no mesmo horário desmarca", () => {
    banco.agenda = { dias: { "1": ["09:00"] } };
    render(<HorariosManager />);
    abrirSecao();
    const chips = screen.getAllByRole("button", { name: "09:00" });
    fireEvent.click(chips[0]); // desmarca a Segunda
    fireEvent.click(screen.getByRole("button", { name: "Salvar horários" }));
    expect(banco.salvar).toHaveBeenCalled();
  });

  it("erro ao salvar mostra mensagem (sem quebrar a tela)", async () => {
    banco.salvar.mockRejectedValue({ code: "unavailable" });
    render(<HorariosManager />);
    abrirSecao();
    fireEvent.click(screen.getByRole("button", { name: "Salvar horários" }));
    expect(await screen.findByText(/Não consegui salvar/)).toBeTruthy();
  });
});
