// @vitest-environment jsdom
// Testes do diálogo de confirmação próprio (substitui o confirm() nativo, Fase C).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Dialogo from "./Dialogo";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

const abrir = (props: Partial<Parameters<typeof Dialogo>[0]> = {}) => {
  const onConfirmar = vi.fn();
  const onCancelar = vi.fn();
  render(
    <Dialogo
      titulo="Excluir serviço"
      texto="Excluir “Esmaltação em gel”?"
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
      {...props}
    />,
  );
  return { onConfirmar, onCancelar };
};

describe("Dialogo", () => {
  it("é um alertdialog nomeado pelo título, com o texto dentro", () => {
    abrir();
    const dialogo = screen.getByRole("alertdialog", { name: "Excluir serviço" });
    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    expect(dialogo.textContent).toContain("Excluir “Esmaltação em gel”?");
  });

  it("leva o foco para o título ao abrir", () => {
    abrir();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Excluir serviço" }));
  });

  it("usa 'Confirmar' como rótulo padrão, mas aceita um texto próprio", () => {
    abrir({ textoConfirmar: "Excluir" });
    expect(screen.getByRole("button", { name: "Excluir" })).toBeTruthy();
  });

  it("tocar em Voltar chama onCancelar, não onConfirmar", () => {
    const { onConfirmar, onCancelar } = abrir();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("tocar no botão de ação chama onConfirmar", () => {
    const { onConfirmar } = abrir({ textoConfirmar: "Excluir" });
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it("tocar no fundo cancela", () => {
    const { onCancelar } = abrir();
    fireEvent.click(document.querySelector(".pn-fundo")!);
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("a tecla Esc cancela", () => {
    const { onCancelar } = abrir();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("trava a rolagem da página enquanto aberto e devolve ao fechar", () => {
    document.body.style.overflow = "auto";
    const { unmount } = render(
      <Dialogo titulo="X" texto="y" onConfirmar={() => {}} onCancelar={() => {}} />,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });
});
