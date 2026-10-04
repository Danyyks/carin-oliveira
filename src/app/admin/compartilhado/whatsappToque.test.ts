// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { abrirWhatsapp, gravarEAbrirWhatsapp } from "./whatsappToque";

function janelaFalsa(closed = false) {
  return { closed, location: { href: "" } } as unknown as Window;
}

describe("abrirWhatsapp", () => {
  const originalHref = window.location.href;
  beforeEach(() => {
    Object.defineProperty(window, "location", { value: { href: originalHref }, writable: true });
  });

  it("navega a janela recebida quando ela ainda está aberta", () => {
    const win = janelaFalsa(false);
    abrirWhatsapp(win, "https://wa.me/5599999999");
    expect(win.location.href).toBe("https://wa.me/5599999999");
  });

  it("cai para a própria aba quando a janela já foi fechada", () => {
    const win = janelaFalsa(true);
    abrirWhatsapp(win, "https://wa.me/5599999999");
    expect(window.location.href).toBe("https://wa.me/5599999999");
  });

  it("cai para a própria aba quando não há janela (win null)", () => {
    abrirWhatsapp(null, "https://wa.me/5599999999");
    expect(window.location.href).toBe("https://wa.me/5599999999");
  });
});

describe("gravarEAbrirWhatsapp", () => {
  it("grava e abre a URL na janela quando tudo dá certo", async () => {
    const win = janelaFalsa(false);
    const gravar = vi.fn().mockResolvedValue(undefined);
    await gravarEAbrirWhatsapp(win, gravar, "https://wa.me/5599999999");
    expect(gravar).toHaveBeenCalledOnce();
    expect(win.location.href).toBe("https://wa.me/5599999999");
  });

  it("sem URL, só grava (nada de WhatsApp)", async () => {
    const win = janelaFalsa(false);
    const gravar = vi.fn().mockResolvedValue(undefined);
    await gravarEAbrirWhatsapp(win, gravar, null);
    expect(gravar).toHaveBeenCalledOnce();
    expect(win.location.href).toBe("");
  });

  it("gravação falhando fecha a janela em branco e não abre nada", async () => {
    const win = { closed: false, close: vi.fn(), location: { href: "" } } as unknown as Window;
    const gravar = vi.fn().mockRejectedValue(new Error("permission-denied"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await gravarEAbrirWhatsapp(win, gravar, "https://wa.me/5599999999");
    expect((win as unknown as { close: () => void }).close).toHaveBeenCalledOnce();
    expect(win.location.href).toBe("");
    errSpy.mockRestore();
  });

  it("sem onErro, a falha só vai pro console (comportamento de sempre)", async () => {
    const win = { closed: false, close: vi.fn(), location: { href: "" } } as unknown as Window;
    const gravar = vi.fn().mockRejectedValue(new Error("offline"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(gravarEAbrirWhatsapp(win, gravar, "https://wa.me/5599999999")).resolves.toBeUndefined();
    errSpy.mockRestore();
  });

  it("com onErro, a falha é repassada pra quem chamou (pra mostrar na tela)", async () => {
    const win = { closed: false, close: vi.fn(), location: { href: "" } } as unknown as Window;
    const erro = new Error("permission-denied");
    const gravar = vi.fn().mockRejectedValue(erro);
    const onErro = vi.fn();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await gravarEAbrirWhatsapp(win, gravar, "https://wa.me/5599999999", onErro);
    expect(onErro).toHaveBeenCalledWith(erro);
    errSpy.mockRestore();
  });
});
