// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { studio } from "@/config/studio";
import MeuLink from "./MeuLink";

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("MeuLink", () => {
  it("mostra o link público do studio", () => {
    render(<MeuLink />);
    expect(screen.getByText(studio.siteUrl)).toBeTruthy();
  });

  it("tocar em Copiar chama a Clipboard API com o link e mostra 'Copiado!'", async () => {
    render(<MeuLink />);
    fireEvent.click(screen.getByRole("button", { name: /Copiar/ }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(studio.siteUrl);
    expect(await screen.findByRole("button", { name: /Copiado!/ })).toBeTruthy();
  });

  it("a mensagem 'Copiado!' volta a 'Copiar' depois de um tempo", async () => {
    vi.useFakeTimers();
    render(<MeuLink />);
    fireEvent.click(screen.getByRole("button", { name: /Copiar/ }));
    await vi.waitFor(() => expect(screen.getByRole("button").textContent).toContain("Copiado!"));
    vi.advanceTimersByTime(2100);
    await vi.waitFor(() => expect(screen.getByRole("button").textContent).toContain("Copiar"));
  });

  it("se a Clipboard API falhar (sem permissão/HTTPS), não quebra a tela", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("nope")) } });
    render(<MeuLink />);
    fireEvent.click(screen.getByRole("button", { name: /Copiar/ }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /Copiar/ })).toBeTruthy(); // continua "Copiar", sem travar
  });
});
