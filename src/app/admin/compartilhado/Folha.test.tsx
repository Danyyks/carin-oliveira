// @vitest-environment jsdom
// Testes da folha (bottom sheet) do painel: acessibilidade, formas de fechar e teclado do iPhone.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Folha from "./Folha";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  Reflect.deleteProperty(window, "visualViewport");
});

const abrir = (props: Partial<Parameters<typeof Folha>[0]> = {}) => {
  const onFechar = vi.fn();
  render(
    <Folha titulo="Bloquear horários" onFechar={onFechar} {...props}>
      <p>conteúdo</p>
    </Folha>,
  );
  return onFechar;
};

describe("Folha", () => {
  it("é um diálogo modal nomeado pelo título, com o conteúdo dentro", () => {
    abrir();
    const dialogo = screen.getByRole("dialog", { name: "Bloquear horários" });
    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    expect(dialogo.textContent).toContain("conteúdo");
  });

  it("leva o foco para o título ao abrir (o leitor de tela anuncia a folha)", () => {
    abrir();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Bloquear horários" }));
  });

  it("o X está sempre visível e fecha", () => {
    const onFechar = abrir();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it("a tecla Esc fecha", () => {
    const onFechar = abrir();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it("outras teclas não fecham", () => {
    const onFechar = abrir();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("tocar no fundo fecha, mas tocar dentro da folha não", () => {
    const onFechar = abrir();
    fireEvent.click(screen.getByText("conteúdo"));
    expect(onFechar).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector(".pn-fundo")!);
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it("trava a rolagem da página enquanto aberta e devolve ao fechar", () => {
    document.body.style.overflow = "auto";
    const { unmount } = render(
      <Folha titulo="X" onFechar={() => {}}>
        <p>a</p>
      </Folha>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("devolve o foco ao botão que abriu", () => {
    const origem = document.createElement("button");
    document.body.appendChild(origem);
    origem.focus();
    const { unmount } = render(
      <Folha titulo="X" onFechar={() => {}}>
        <p>a</p>
      </Folha>,
    );
    expect(document.activeElement).not.toBe(origem);
    unmount();
    expect(document.activeElement).toBe(origem);
    origem.remove();
  });

  it("mostra o rodapé fixo quando há um", () => {
    abrir({ rodape: <button>Salvar</button> });
    expect(screen.getByRole("button", { name: "Salvar" })).toBeTruthy();
  });

  it("depois de desmontada, Esc não chama mais o onFechar", () => {
    const onFechar = vi.fn();
    const { unmount } = render(
      <Folha titulo="X" onFechar={onFechar}>
        <p>a</p>
      </Folha>,
    );
    unmount();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("usa sempre o onFechar mais novo, sem reabrir a folha", () => {
    const a = vi.fn();
    const b = vi.fn();
    const { rerender } = render(
      <Folha titulo="X" onFechar={a}>
        <p>a</p>
      </Folha>,
    );
    rerender(
      <Folha titulo="X" onFechar={b}>
        <p>a</p>
      </Folha>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  describe("teclado do iPhone", () => {
    function falsoViewport(altura: number) {
      const ouvintes: Record<string, () => void> = {};
      const vv = {
        height: altura,
        offsetTop: 0,
        addEventListener: (nome: string, f: () => void) => (ouvintes[nome] = f),
        removeEventListener: vi.fn(),
      };
      Object.defineProperty(window, "visualViewport", { configurable: true, value: vv });
      return { vv, ouvintes };
    }

    it("sobe a folga pela altura do teclado e acompanha quando ele muda", () => {
      const { vv, ouvintes } = falsoViewport(window.innerHeight); // sem teclado
      abrir();
      const dialogo = screen.getByRole("dialog");
      expect(dialogo.style.getPropertyValue("--kb")).toBe("0px");

      vv.height = window.innerHeight - 300; // teclado abriu
      ouvintes.resize();
      expect(dialogo.style.getPropertyValue("--kb")).toBe("300px");
    });

    it("tira os ouvintes ao fechar", () => {
      const { vv } = falsoViewport(window.innerHeight);
      const { unmount } = render(
        <Folha titulo="X" onFechar={() => {}}>
          <p>a</p>
        </Folha>,
      );
      unmount();
      expect(vv.removeEventListener).toHaveBeenCalledTimes(2);
    });

    it("sem visualViewport (navegador antigo) continua funcionando", () => {
      expect(() => abrir()).not.toThrow();
    });
  });
});
