// @vitest-environment jsdom
// Testes do aviso com "Desfazer": duração, pausa com o dedo, desfazer e falha ao desfazer.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useDesfazer } from "./useDesfazer";

function Tela({ desfazer }: { desfazer?: () => Promise<unknown> | void }) {
  const { avisar, aviso } = useDesfazer();
  return (
    <>
      <button onClick={() => avisar("2 horários bloqueados.", desfazer)}>bloquear</button>
      <button onClick={() => avisar("Outra coisa.")}>outro</button>
      {aviso}
    </>
  );
}

const tocar = (nome: string) => fireEvent.click(screen.getByRole("button", { name: nome }));
const passar = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useDesfazer", () => {
  it("a região de status existe desde o começo, vazia (o leitor de tela anuncia o que entra)", () => {
    render(<Tela />);
    const regiao = screen.getByRole("status");
    expect(regiao.textContent).toBe("");
  });

  it("mostra o aviso com o botão Desfazer", () => {
    render(<Tela desfazer={() => {}} />);
    tocar("bloquear");
    expect(screen.getByRole("status").textContent).toContain("2 horários bloqueados.");
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeTruthy();
  });

  it("some sozinho depois de 6 segundos, não antes", () => {
    render(<Tela desfazer={() => {}} />);
    tocar("bloquear");
    passar(5999);
    expect(screen.queryByText("2 horários bloqueados.")).toBeTruthy();
    passar(1);
    expect(screen.queryByText("2 horários bloqueados.")).toBeNull();
  });

  it("com o dedo em cima a contagem para, e recomeça ao soltar", () => {
    render(<Tela desfazer={() => {}} />);
    tocar("bloquear");
    const aviso = screen.getByText("2 horários bloqueados.").parentElement!;

    passar(4000);
    fireEvent.pointerDown(aviso);
    passar(60000); // segurando
    expect(screen.queryByText("2 horários bloqueados.")).toBeTruthy();

    fireEvent.pointerUp(aviso);
    passar(5999);
    expect(screen.queryByText("2 horários bloqueados.")).toBeTruthy();
    passar(1);
    expect(screen.queryByText("2 horários bloqueados.")).toBeNull();
  });

  it("um aviso novo troca o anterior (só um por vez) e reinicia a contagem", () => {
    render(<Tela desfazer={() => {}} />);
    tocar("bloquear");
    passar(5000);
    tocar("outro");
    expect(screen.queryByText("2 horários bloqueados.")).toBeNull();
    expect(screen.getByText("Outra coisa.")).toBeTruthy();
    passar(5999); // 5 s do primeiro não contam mais
    expect(screen.queryByText("Outra coisa.")).toBeTruthy();
    passar(1);
    expect(screen.queryByText("Outra coisa.")).toBeNull();
  });

  it("aviso sem ação não mostra o botão Desfazer", () => {
    render(<Tela />);
    tocar("outro");
    expect(screen.queryByRole("button", { name: "Desfazer" })).toBeNull();
  });

  it("Desfazer executa a ação uma vez e confirma com 'Desfeito.'", async () => {
    const desfazer = vi.fn().mockResolvedValue(undefined);
    render(<Tela desfazer={desfazer} />);
    tocar("bloquear");
    await act(async () => {
      tocar("Desfazer");
    });
    expect(desfazer).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Desfeito.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Desfazer" })).toBeNull();
  });

  it("dois toques rápidos em Desfazer não executam duas vezes", async () => {
    let terminar: () => void = () => {};
    const desfazer = vi.fn(() => new Promise<void>((ok) => (terminar = ok)));
    render(<Tela desfazer={desfazer} />);
    tocar("bloquear");
    const botao = screen.getByRole("button", { name: "Desfazer" }) as HTMLButtonElement;
    fireEvent.click(botao);
    expect(botao.disabled).toBe(true);
    fireEvent.click(botao);
    expect(desfazer).toHaveBeenCalledTimes(1);
    await act(async () => terminar());
  });

  it("se desfazer falhar, avisa e não diz que desfez", async () => {
    render(<Tela desfazer={() => Promise.reject(new Error("offline"))} />);
    tocar("bloquear");
    await act(async () => {
      tocar("Desfazer");
    });
    expect(screen.getByText("Não consegui desfazer. Confira a conexão e tente de novo.")).toBeTruthy();
    expect(screen.queryByText("Desfeito.")).toBeNull();
  });

  it("a contagem não fica rodando depois que a tela sai", () => {
    const { unmount } = render(<Tela desfazer={() => {}} />);
    tocar("bloquear");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
