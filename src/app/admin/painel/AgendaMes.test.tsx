// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AgendaMes from "./AgendaMes";

afterEach(() => cleanup());

describe("AgendaMes", () => {
  it("mostra o mês/ano da data selecionada", () => {
    render(<AgendaMes dataSelecionada="2026-09-28" pedidos={new Set()} folgas={new Set()} onEscolher={vi.fn()} />);
    expect(screen.getByText("setembro 2026")).toBeTruthy();
  });

  it("tocar num dia chama onEscolher com a data completa", () => {
    const onEscolher = vi.fn();
    render(<AgendaMes dataSelecionada="2026-09-28" pedidos={new Set()} folgas={new Set()} onEscolher={onEscolher} />);
    fireEvent.click(screen.getByRole("button", { name: "15" }));
    expect(onEscolher).toHaveBeenCalledWith("2026-09-15");
  });

  it("dias passados ficam clicáveis (é navegação, não marcar folga)", () => {
    render(<AgendaMes dataSelecionada="2026-09-28" pedidos={new Set()} folgas={new Set()} onEscolher={vi.fn()} />);
    const dia1 = screen.getByRole("button", { name: "1" }) as HTMLButtonElement;
    expect(dia1.disabled).toBe(false);
  });

  it("navega para o mês seguinte e anterior", () => {
    render(<AgendaMes dataSelecionada="2026-09-28" pedidos={new Set()} folgas={new Set()} onEscolher={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByText("outubro 2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByText("agosto 2026")).toBeTruthy();
  });
});
