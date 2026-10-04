// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TabBar, { abaValida } from "./TabBar";

afterEach(() => cleanup());

describe("TabBar", () => {
  it("mostra as 5 abas na ordem certa", () => {
    render(<TabBar aba="agenda" onMudar={vi.fn()} pedidos={0} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Agenda", "Pedidos", "Horários", "Serviços", "Conta"]);
  });

  it("marca a aba atual como selecionada", () => {
    render(<TabBar aba="pedidos" onMudar={vi.fn()} pedidos={0} />);
    expect(screen.getByRole("tab", { name: /Pedidos/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /Agenda/ }).getAttribute("aria-selected")).toBe("false");
  });

  it("tocar numa aba chama onMudar com o id certo", () => {
    const onMudar = vi.fn();
    render(<TabBar aba="agenda" onMudar={onMudar} pedidos={0} />);
    fireEvent.click(screen.getByRole("tab", { name: /Serviços/ }));
    expect(onMudar).toHaveBeenCalledWith("servicos");
  });

  it("sem pedidos pendentes, não mostra a bolinha", () => {
    render(<TabBar aba="agenda" onMudar={vi.fn()} pedidos={0} />);
    expect(screen.getByRole("tab", { name: /Pedidos/ }).textContent).toBe("Pedidos");
  });

  it("com pedidos pendentes, mostra a contagem na aba Pedidos", () => {
    render(<TabBar aba="agenda" onMudar={vi.fn()} pedidos={3} />);
    expect(screen.getByRole("tab", { name: /Pedidos/ }).textContent).toContain("3");
  });

  it("mais de 99 pedidos mostra '99+'", () => {
    render(<TabBar aba="agenda" onMudar={vi.fn()} pedidos={150} />);
    expect(screen.getByRole("tab", { name: /Pedidos/ }).textContent).toContain("99+");
  });
});

describe("abaValida", () => {
  it("aceita qualquer uma das 5 abas de verdade", () => {
    for (const a of ["agenda", "pedidos", "horarios", "servicos", "conta"]) {
      expect(abaValida(a)).toBe(a);
    }
  });

  it("texto qualquer, vazio ou ausente vira null", () => {
    expect(abaValida("lixo")).toBeNull();
    expect(abaValida("")).toBeNull();
    expect(abaValida(null)).toBeNull();
    expect(abaValida(undefined)).toBeNull();
  });
});
