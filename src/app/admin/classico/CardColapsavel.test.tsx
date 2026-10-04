// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CardColapsavel from "./CardColapsavel";

afterEach(() => cleanup());

describe("CardColapsavel", () => {
  it("por padrão nasce fechada", () => {
    render(<CardColapsavel titulo="Título">conteúdo</CardColapsavel>);
    expect(screen.queryByText("conteúdo")).toBeNull();
    expect(screen.getByRole("button", { name: /Título/ }).getAttribute("aria-expanded")).toBe("false");
  });

  it("tocar no título abre e mostra o conteúdo", () => {
    render(<CardColapsavel titulo="Título">conteúdo</CardColapsavel>);
    fireEvent.click(screen.getByRole("button", { name: /Título/ }));
    expect(screen.getByText("conteúdo")).toBeTruthy();
  });

  it("abertoInicial nasce já aberta (usada pelo painel novo, sem sanfona)", () => {
    render(<CardColapsavel titulo="Título" abertoInicial>conteúdo</CardColapsavel>);
    expect(screen.getByText("conteúdo")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Título/ }).getAttribute("aria-expanded")).toBe("true");
  });

  it("mesmo com abertoInicial, continua colapsável (a dona pode fechar se quiser)", () => {
    render(<CardColapsavel titulo="Título" abertoInicial>conteúdo</CardColapsavel>);
    fireEvent.click(screen.getByRole("button", { name: /Título/ }));
    expect(screen.queryByText("conteúdo")).toBeNull();
  });
});
