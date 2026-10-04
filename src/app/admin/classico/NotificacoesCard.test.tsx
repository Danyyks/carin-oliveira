// @vitest-environment jsdom
// Caracterização do cartão de Notificações (push): estados suportado/indisponível/erro.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import NotificacoesCard from "./NotificacoesCard";

const push = vi.hoisted(() => ({
  suportadas: vi.fn(),
  permissao: vi.fn(),
  ativar: vi.fn(),
  ouvir: vi.fn(),
}));

vi.mock("@/lib/push", () => ({
  notificacoesSuportadas: push.suportadas,
  permissaoAtual: push.permissao,
  ativarNotificacoes: push.ativar,
  ouvirMensagensEmPrimeiroPlano: push.ouvir,
}));

function abrirSecao() {
  fireEvent.click(screen.getByRole("button", { name: /Notificações/ }));
}

beforeEach(() => {
  push.suportadas.mockReset().mockResolvedValue(true);
  push.permissao.mockReset().mockReturnValue("default");
  push.ativar.mockReset().mockResolvedValue("token-fake");
  push.ouvir.mockReset().mockResolvedValue(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Aparelho sem suporte", () => {
  it("mostra a orientação de instalar na tela inicial (iPhone)", async () => {
    push.suportadas.mockResolvedValue(false);
    render(<NotificacoesCard />);
    abrirSecao();
    expect(await screen.findByText(/Adicionar à Tela de Início/)).toBeTruthy();
  });
});

describe("Aparelho com suporte, sem permissão ainda", () => {
  it("oferece o botão Ativar notificações", async () => {
    render(<NotificacoesCard />);
    abrirSecao();
    expect(await screen.findByRole("button", { name: "Ativar notificações" })).toBeTruthy();
  });

  it("tocar em Ativar chama ativarNotificacoes e mostra o estado ok", async () => {
    render(<NotificacoesCard />);
    abrirSecao();
    fireEvent.click(await screen.findByRole("button", { name: "Ativar notificações" }));
    await waitFor(() => expect(push.ativar).toHaveBeenCalledOnce());
    expect(await screen.findByText(/Ativadas neste aparelho/)).toBeTruthy();
  });

  it("erro ao ativar mostra a mensagem e o botão de tentar de novo", async () => {
    push.ativar.mockRejectedValue(Object.assign(new Error("Permissão negada."), { code: "permission-denied" }));
    render(<NotificacoesCard />);
    abrirSecao();
    fireEvent.click(await screen.findByRole("button", { name: "Ativar notificações" }));
    expect(await screen.findByRole("button", { name: "Tentar de novo" })).toBeTruthy();
    expect(screen.getByText(/Permissão negada\. \[permission-denied\]/)).toBeTruthy();
  });
});

describe("Já com permissão concedida", () => {
  it("re-ativa sozinho ao montar (re-gera o token)", async () => {
    push.permissao.mockReturnValue("granted");
    render(<NotificacoesCard />);
    abrirSecao();
    await waitFor(() => expect(push.ativar).toHaveBeenCalledOnce());
    expect(await screen.findByText(/Ativadas neste aparelho/)).toBeTruthy();
  });
});
