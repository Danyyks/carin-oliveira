// @vitest-environment jsdom
// Caracterização da montagem do painel clássico: todas as seções aparecem, na ordem
// certa, e o Sair chama logout. Cada seção já tem seu próprio teste de comportamento;
// aqui é só a composição (o que a Fase B0 moveu de page.tsx sem mudar nada).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import DashboardClassico from "./DashboardClassico";

vi.mock("./AgendamentosManager", () => ({ default: () => <div data-testid="sec-agendamentos" /> }));
vi.mock("./NovoAgendamentoManual", () => ({ default: () => <div data-testid="sec-novo" /> }));
vi.mock("./NotificacoesCard", () => ({ default: () => <div data-testid="sec-notificacoes" /> }));
vi.mock("./ServicosManager", () => ({ default: () => <div data-testid="sec-servicos" /> }));
vi.mock("./HorariosManager", () => ({ default: () => <div data-testid="sec-horarios" /> }));
vi.mock("./CalendarioFolgas", () => ({ default: () => <div data-testid="sec-folgas" /> }));
vi.mock("@/components/AssinaturaDSS", () => ({ default: () => <div data-testid="sec-assinatura" /> }));

afterEach(() => cleanup());

describe("DashboardClassico", () => {
  it("monta todas as seções, na ordem certa", () => {
    render(<DashboardClassico email="carin@example.com" logout={vi.fn()} />);
    const ids = ["sec-agendamentos", "sec-novo", "sec-notificacoes", "sec-servicos", "sec-horarios", "sec-folgas", "sec-assinatura"];
    const nos = ids.map((id) => screen.getByTestId(id));
    for (let i = 1; i < nos.length; i++) {
      expect(nos[i - 1].compareDocumentPosition(nos[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("mostra o e-mail da dona logada", () => {
    render(<DashboardClassico email="carin@example.com" logout={vi.fn()} />);
    expect(screen.getByText("carin@example.com")).toBeTruthy();
  });

  it("Sair chama o logout recebido", () => {
    const logout = vi.fn();
    render(<DashboardClassico email="carin@example.com" logout={logout} />);
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
