// @vitest-environment jsdom
// Editor de horários de um dia (Fase C): chips, salvar e "copiar para seg a sex".
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Agenda } from "@/lib/db";
import FolhaHorarioDia from "./FolhaHorarioDia";

const banco = vi.hoisted(() => ({ salvar: vi.fn() }));
vi.mock("@/lib/db", () => ({ salvarAgenda: banco.salvar }));

beforeEach(() => {
  banco.salvar.mockReset().mockResolvedValue(undefined);
});
afterEach(() => cleanup());

const agenda: Agenda = { dias: { "1": ["09:00", "10:00"], "6": ["09:00"] }, bloqueios: [] };

describe("FolhaHorarioDia", () => {
  it("pré-marca os chips dos horários já ativos naquele dia", () => {
    render(
      <FolhaHorarioDia diaK="1" diaLabel="Segunda" agenda={agenda} onFechar={vi.fn()} onSalvo={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "09:00" }).className).toContain("active");
    expect(screen.getByRole("button", { name: "11:00" }).className).not.toContain("active");
  });

  it("tocar num chip alterna e Salvar grava só o dia editado", async () => {
    const onSalvo = vi.fn();
    render(
      <FolhaHorarioDia diaK="1" diaLabel="Segunda" agenda={agenda} onFechar={vi.fn()} onSalvo={onSalvo} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "11:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(banco.salvar).toHaveBeenCalledWith({
        dias: { "1": ["09:00", "10:00", "11:00"], "6": ["09:00"] },
      }),
    );
    expect(onSalvo).toHaveBeenCalledOnce();
  });

  it("'Salvar e copiar para segunda a sexta' aplica o mesmo grupo a 1..5, sem tocar no sábado", async () => {
    render(
      <FolhaHorarioDia diaK="1" diaLabel="Segunda" agenda={agenda} onFechar={vi.fn()} onSalvo={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar e copiar para segunda a sexta" }));
    await waitFor(() =>
      expect(banco.salvar).toHaveBeenCalledWith({
        dias: {
          "1": ["09:00", "10:00"],
          "2": ["09:00", "10:00"],
          "3": ["09:00", "10:00"],
          "4": ["09:00", "10:00"],
          "5": ["09:00", "10:00"],
          "6": ["09:00"],
        },
      }),
    );
  });

  it("no sábado não mostra o botão de copiar", () => {
    render(
      <FolhaHorarioDia diaK="6" diaLabel="Sábado" agenda={agenda} onFechar={vi.fn()} onSalvo={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: /copiar/ })).toBeNull();
  });

  it("erro ao salvar mostra mensagem humana", async () => {
    banco.salvar.mockRejectedValue({ code: "unavailable" });
    render(
      <FolhaHorarioDia diaK="1" diaLabel="Segunda" agenda={agenda} onFechar={vi.fn()} onSalvo={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(banco.salvar).toHaveBeenCalled());
    expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
  });
});
