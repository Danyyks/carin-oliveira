// @vitest-environment jsdom
// Teste do shell do painel novo: troca de abas e a contagem de pedidos na TabBar.
// Cada aba já tem seu próprio teste de comportamento; aqui é só a composição.
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import PainelNovo from "./PainelNovo";

vi.mock("./AgendaDia", () => ({
  default: ({ diaInicial }: { diaInicial?: string }) => (
    <div data-testid="aba-agenda" data-dia-inicial={diaInicial ?? ""} />
  ),
}));
vi.mock("./PedidosTab", () => ({ default: () => <div data-testid="aba-pedidos" /> }));
vi.mock("./HorariosTab", () => ({
  default: ({ onVerNoDia }: { onVerNoDia: (d: string) => void }) => (
    <div data-testid="aba-horarios">
      <button onClick={() => onVerNoDia("2026-10-02")}>ver folga na agenda</button>
    </div>
  ),
}));
vi.mock("./ServicosTab", () => ({
  default: () => <div data-testid="aba-servicos" />,
}));
vi.mock("../classico/NotificacoesCard", () => ({
  default: ({ semSanfona }: { semSanfona?: boolean }) => <div data-testid="aba-notificacoes" data-sem-sanfona={String(!!semSanfona)} />,
}));
vi.mock("@/components/AssinaturaDSS", () => ({ default: () => <div data-testid="assinatura" /> }));

const banco = vi.hoisted(() => ({
  agendamentos: [] as { status: string }[],
  offline: false,
}));
vi.mock("../compartilhado/useOffline", () => ({ useOffline: () => banco.offline }));
vi.mock("./DadosProvider", () => ({
  default: ({ children }: { children: ReactNode }) => children,
  useDados: () => ({
    servicos: [],
    agenda: { dias: {}, bloqueios: [] },
    slots: [],
    agendamentos: banco.agendamentos,
    carregando: false,
    erros: { servicos: false, agenda: false, slots: false, agendamentos: false },
  }),
}));

beforeEach(() => {
  banco.agendamentos = [];
  banco.offline = false;
});
afterEach(() => cleanup());

describe("PainelNovo", () => {
  it("começa na aba Agenda", () => {
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    expect(screen.getByTestId("aba-agenda")).toBeTruthy();
    expect(screen.queryByTestId("aba-pedidos")).toBeNull();
  });

  it("troca para Pedidos ao tocar na aba", () => {
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: /Pedidos/ }));
    expect(screen.getByTestId("aba-pedidos")).toBeTruthy();
    expect(screen.queryByTestId("aba-agenda")).toBeNull();
  });

  it("aba Horários mostra a aba redesenhada (Fase C)", () => {
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: /Horários/ }));
    expect(screen.getByTestId("aba-horarios")).toBeTruthy();
  });

  it("tocar numa folga em Horários leva pra Agenda naquele dia", () => {
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: /Horários/ }));
    fireEvent.click(screen.getByRole("button", { name: "ver folga na agenda" }));
    expect(screen.getByTestId("aba-agenda").getAttribute("data-dia-inicial")).toBe("2026-10-02");
    expect(screen.getByRole("tab", { name: /Agenda/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("aba Serviços mostra a aba redesenhada (Fase C)", () => {
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: /Serviços/ }));
    expect(screen.getByTestId("aba-servicos")).toBeTruthy();
  });

  it("aba Conta mostra o e-mail, o Meu link e o botão Sair", () => {
    const logout = vi.fn();
    render(<PainelNovo email="carin@example.com" logout={logout} />);
    fireEvent.click(screen.getByRole("tab", { name: /Conta/ }));
    expect(screen.getByText("carin@example.com")).toBeTruthy();
    expect(screen.getByText("Meu link")).toBeTruthy();
    expect(screen.getByTestId("aba-notificacoes").getAttribute("data-sem-sanfona")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledOnce();
  });

  it("a bolinha de Pedidos reflete os agendamentos pendentes", () => {
    banco.agendamentos = [{ status: "pendente" }, { status: "confirmado" }, { status: "pendente" }];
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /Pedidos/ }).textContent).toContain("2");
  });

  it("atualiza a bolinha do ícone do app a partir do shell (não da aba Pedidos)", () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { setAppBadge, clearAppBadge });
    banco.agendamentos = [{ status: "pendente" }];
    // Começa numa aba diferente de Pedidos — se o efeito estivesse dentro do PedidosTab
    // (como no clássico), ele nunca rodaria aqui.
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    expect(setAppBadge).toHaveBeenCalledWith(1);
  });

  it("mostra o aviso de sem conexão quando offline", () => {
    banco.offline = true;
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toContain("Sem conexão");
  });

  it("online, não mostra o aviso de sem conexão", () => {
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("deep link de notificação", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/admin/nova");
  });

  it("'?aba=pedidos' na URL já abre na aba Pedidos", () => {
    window.history.pushState(null, "", "/admin/nova?aba=pedidos");
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    expect(screen.getByTestId("aba-pedidos")).toBeTruthy();
  });

  it("'?dia=' na URL passa o dia pra Agenda", () => {
    window.history.pushState(null, "", "/admin/nova?dia=2026-10-02");
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    expect(screen.getByTestId("aba-agenda").getAttribute("data-dia-inicial")).toBe("2026-10-02");
  });

  it("aba inválida na URL cai no padrão (Agenda), sem quebrar", () => {
    window.history.pushState(null, "", "/admin/nova?aba=lixo");
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    expect(screen.getByTestId("aba-agenda")).toBeTruthy();
  });

  it("limpa a query string depois de ler (link de uso único)", () => {
    window.history.pushState(null, "", "/admin/nova?aba=pedidos");
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    expect(window.location.search).toBe("");
  });

  it("com o app já aberto, a mensagem do service worker troca de aba sem recarregar", () => {
    const ouvintes: Record<string, (e: MessageEvent) => void> = {};
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        addEventListener: (nome: string, f: (e: MessageEvent) => void) => (ouvintes[nome] = f),
        removeEventListener: vi.fn(),
      },
    });
    render(<PainelNovo email="carin@example.com" logout={vi.fn()} />);
    expect(screen.getByTestId("aba-agenda")).toBeTruthy();

    act(() => {
      ouvintes.message({ data: { type: "notification-clicked", aba: "pedidos" } } as MessageEvent);
    });
    expect(screen.getByTestId("aba-pedidos")).toBeTruthy();
  });
});
